import * as fs from "fs";
import * as core from "@actions/core";
import * as github from "@actions/github";

import type { Changes } from "./changes";
import { getChangesInPush, getChangesInPullRequest } from "./changes";
import type { Context } from "./context";
import type { GitHubClient } from "./github-api";
import * as githubApi from "./github-api";
import type { Inputs } from "./inputs";
import { getInputs } from "./inputs";
import type { PullRequest } from "./pull-request";

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

    if (github.context.ref === inputs.defaultBranch) {
      return await handleMain(inputs, client);
    }

    const pullRequest = github.context.payload.pull_request as PullRequest;

    if (pullRequest) {
      return await handlePullRequest(inputs, client, pullRequest);
    }

    core.info("Ignoring non-default-branch, non-PullRequest Event");
  } catch (error) {
    if (error instanceof Error) {
      core.error(error);
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
  const changes = await getChangesInPush();

  if (changes.additions.includes(inputs.haltFile)) {
    core.startGroup(`${inputs.defaultBranch}:${inputs.haltFile} added`);
    const message = haltMessage(fs.readFileSync(inputs.haltFile).toString());
    core.info(`Halting all open PRs: ${message}`);
    await haltOpenPullRequests(client, github.context, inputs, message);
    core.endGroup();
  }

  if (changes.removals.includes(inputs.haltFile)) {
    core.startGroup(`${inputs.defaultBranch}:${inputs.haltFile} removed`);
    core.info("Un-halting all open PRs");
    await unhaltOpenPullRequests(client, github.context, inputs);
    core.endGroup();
  }
}

async function handlePullRequest(
  inputs: Inputs,
  client: GitHubClient,
  pullRequest: PullRequest
): Promise<void> {
  const haltFile = await githubApi.getRepositoryContent(client, {
    ...github.context.repo,
    path: inputs.haltFile,
    ref: inputs.defaultBranch,
  });

  const haltFileContents =
    haltFile && "content" in haltFile ? atob(haltFile.content) : null;

  if (haltFileContents === null) {
    core.info("Repository not halted");
    return await unhaltPullRequest(client, github.context, inputs, pullRequest);
  }

  const changes = await getChangesInPullRequest(
    client,
    github.context,
    pullRequest
  );

  if (changes.removals.includes(inputs.haltFile)) {
    core.info(`${inputs.defaultBranch}:${inputs.haltFile} exists, but removed`);
    return await unhaltPullRequest(client, github.context, inputs, pullRequest);
  }

  core.info(`${inputs.defaultBranch}:${inputs.haltFile} exists`);
  await haltPullRequest(
    client,
    github.context,
    inputs,
    pullRequest,
    haltMessage(haltFileContents)
  );
}

async function haltOpenPullRequests(
  client: GitHubClient,
  context: Context,
  inputs: Inputs,
  message: string
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
  inputs: Inputs
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
  message: string
): Promise<void> {
  console.info(`Setting halted status for PR #${pullRequest.number}`);
  await githubApi.createCommitStatus(client, {
    ...context.repo,
    sha: pullRequest.head.sha,
    context: inputs.statusContext,
    state: "failure",
    description: message,
    target_url: inputs.statusTargetUrl,
  });
}

async function unhaltPullRequest(
  client: GitHubClient,
  context: Context,
  inputs: Inputs,
  pullRequest: PullRequest
): Promise<void> {
  console.info(`Setting un-halted status for PR #${pullRequest.number}`);
  await githubApi.createCommitStatus(client, {
    ...context.repo,
    sha: pullRequest.head.sha,
    context: inputs.statusContext,
    state: "success",
    description: "Merge away",
    target_url: inputs.statusTargetUrl,
  });
}

function haltMessage(contents: string): string {
  return contents.trim() === "" ? "Merges halted" : contents.trim();
}

run();
