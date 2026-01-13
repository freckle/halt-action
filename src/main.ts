import * as fs from "fs";
import * as core from "@actions/core";
import * as github from "@actions/github";

import type { IncomingWebhookSendArguments } from "@slack/webhook";
import { IncomingWebhook } from "@slack/webhook";
import { getChangesInPush, getChangesInPullRequest } from "./changes";
import type { Context } from "./context";
import type { GitHubClient } from "./github-api";
import * as githubApi from "./github-api";
import type { Inputs } from "./inputs";
import { getInputs } from "./inputs";
import type { PullRequest } from "./pull-request";
import type { Message } from "./message";
import * as message from "./message";

async function run() {
  try {
    core.startGroup("Inputs");
    const inputs = getInputs();
    core.info(`defaultBranch: ${inputs.defaultBranch}`);
    core.info(`haltFile: ${inputs.haltFile}`);
    core.info(`statusContext: ${inputs.statusContext}`);
    core.info(`statusTargetUrl: ${inputs.statusTargetUrl}`);
    core.info(`githubToken: ${inputs.githubToken}`);
    core.endGroup();

    const client = githubApi.getClient(inputs.githubToken);

    if (github.context.ref === `refs/heads/${inputs.defaultBranch}`) {
      return await handleMain(inputs, client);
    }

    const pullRequest = github.context.payload.pull_request as PullRequest;

    if (pullRequest) {
      return await handlePullRequest(inputs, client, pullRequest);
    }

    const payload = Object.keys(github.context.payload);
    const details = [
      `event: ${github.context.eventName}`,
      `ref: ${github.context.ref}`,
      `payload: [${payload.join(", ")}]`,
    ];
    core.info(`Ignoring:\n  ${details.join("\n  ")}`);
  } catch (error) {
    if (error instanceof Error) {
      core.error(`${error.name}: ${error.message}\n${error.stack}`);
      core.setFailed(error.message);
    } else if (typeof error === "string") {
      core.error(error);
      core.setFailed(error);
    } else {
      core.error("Non-Error exception");
      core.setFailed("Non-Error exception");
    }
  }
}

async function handleMain(inputs: Inputs, client: GitHubClient): Promise<void> {
  const changes = await getChangesInPush(inputs.defaultBranch);

  if (changes.additions.includes(inputs.haltFile)) {
    core.startGroup(`${inputs.defaultBranch}:${inputs.haltFile} added`);
    const msg = message.fromContent(
      fs.readFileSync(inputs.haltFile).toString(),
    );
    core.info(`Halting all open PRs: ${msg.title}`);
    await haltOpenPullRequests(client, github.context, inputs, msg);
    await addWorkflowSummary(msg);
    await sendSlackNotifications(inputs, msg);
    core.endGroup();
  }

  if (changes.removals.includes(inputs.haltFile)) {
    core.startGroup(`${inputs.defaultBranch}:${inputs.haltFile} removed`);
    core.info("Un-halting all open PRs");
    await unhaltOpenPullRequests(client, github.context, inputs);
    await sendSlackNotifications(inputs);
    core.endGroup();
  }
}

async function handlePullRequest(
  inputs: Inputs,
  client: GitHubClient,
  pullRequest: PullRequest,
): Promise<void> {
  const haltBranch = inputs.haltBranch || inputs.defaultBranch;
  const haltFile = await githubApi.getRepositoryContent(client, {
    ...github.context.repo,
    path: inputs.haltFile,
    ref: haltBranch,
  });

  const haltFileContents =
    haltFile && "content" in haltFile ? decodeBase64(haltFile.content) : null;

  if (haltFileContents === null) {
    core.info("Repository not halted");
    return await unhaltPullRequest(client, github.context, inputs, pullRequest);
  }

  const changes = await getChangesInPullRequest(
    client,
    github.context,
    pullRequest,
  );

  if (changes.removals.includes(inputs.haltFile)) {
    core.info(`${haltBranch}:${inputs.haltFile} exists, but removed`);
    return await unhaltPullRequest(client, github.context, inputs, pullRequest);
  }

  core.info(`${haltBranch}:${inputs.haltFile} exists`);
  const msg = message.fromContent(haltFileContents);
  await haltPullRequest(client, github.context, inputs, pullRequest, msg);
  await addWorkflowSummary(msg);
}

function decodeBase64(input: string): string {
  const buff = Buffer.from(input, "base64");
  return buff.toString("utf-8");
}

async function haltOpenPullRequests(
  client: GitHubClient,
  context: Context,
  inputs: Inputs,
  message: Message,
): Promise<void> {
  const pullRequests = await githubApi.listRepositoryPullRequests(client, {
    ...context.repo,
    state: "open",
  });

  await pullRequests.forEach(async (pullRequest) => {
    await haltPullRequest(client, context, inputs, pullRequest, message);
  });
}

async function unhaltOpenPullRequests(
  client: GitHubClient,
  context: Context,
  inputs: Inputs,
): Promise<void> {
  const pullRequests = await githubApi.listRepositoryPullRequests(client, {
    ...context.repo,
    state: "open",
  });

  await pullRequests.forEach(async (pullRequest) => {
    await unhaltPullRequest(client, context, inputs, pullRequest);
  });
}

async function haltPullRequest(
  client: GitHubClient,
  context: Context,
  inputs: Inputs,
  pullRequest: PullRequest,
  msg: Message,
): Promise<void> {
  core.info(`Setting halted status for PR #${pullRequest.number}`);
  await githubApi.createCommitStatus(client, {
    ...context.repo,
    sha: pullRequest.head.sha,
    context: inputs.statusContext,
    state: "failure",
    description: message.toStatusDescription(msg),
    target_url: inputs.statusTargetUrl,
  });
}

async function unhaltPullRequest(
  client: GitHubClient,
  context: Context,
  inputs: Inputs,
  pullRequest: PullRequest,
): Promise<void> {
  core.info(`Setting un-halted status for PR #${pullRequest.number}`);
  await githubApi.createCommitStatus(client, {
    ...context.repo,
    sha: pullRequest.head.sha,
    context: inputs.statusContext,
    state: "success",
    description: "Merge away",
    target_url: inputs.statusTargetUrl,
  });
}

async function addWorkflowSummary(msg: Message): Promise<void> {
  const summary = core.summary.addHeading(msg.title);

  if (msg.summary) {
    summary.addRaw(msg.summary);
  }

  await summary.write();
}

async function sendSlackNotifications(
  inputs: Inputs,
  msg?: Message,
): Promise<void> {
  if (!inputs.slackWebhook) {
    core.debug("Skipping Slack notification (no webhook)");
    return;
  }

  // Use presence of msg to know if we're sending failure or success
  const { color, title, value } = msg
    ? {
        color: "failure",
        title: `CI/CD on ${github.context.repo} has been halted`,
        value: message.wasOriginallyEmpty(msg) ? "" : message.toString(msg),
      }
    : {
        color: "success",
        title: `CI/CD on ${github.context.repo} is no longer halted`,
        value: "",
      };

  const slack = new IncomingWebhook(inputs.slackWebhook);
  const webhook: IncomingWebhookSendArguments = {
    attachments: [
      {
        fallback: title,
        color,
        fields: [
          {
            title,
            value,
            short: false,
          },
        ],
      },
    ],
  };

  const promises = inputs.slackChannels
    ? inputs.slackChannels.map((channel) => {
        webhook.channel = channel;
        return slack.send(webhook);
      })
    : [slack.send(webhook)];

  core.debug(`Sending ${promises.length} Slack notification(s)`);
  const results = Promise.all(promises);
  core.debug(`Response(s): ${results}`);
}

run();
