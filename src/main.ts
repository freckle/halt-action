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
    const inputs = getInputs();
    const client = githubApi.getClient(inputs.githubToken);

    if (github.context.ref === inputs.defaultBranch) {
      return await handleMain(inputs, client);
    }

    const pullRequest = github.context.payload.pullRequest;

    if (pullRequest) {
      return await handlePullRequest(inputs, client, pullRequest);
    }

    core.info("Ingoring non-default-branch, non-PullRequest Event");
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
    core.info(`${inputs.haltFile} added in push to ${inputs.defaultBranch}`);
    core.info("Halting all open PRs");
    const description = fs.readFileSync(inputs.haltFile).toString().trim();
    await haltOpenPullRequests(client, github.context, inputs, description);
  }

  if (changes.removals.includes(inputs.haltFile)) {
    core.info(`${inputs.haltFile} removed in push to ${inputs.defaultBranch}`);
    core.info("Un-halting all open PRs");
    await unhaltOpenPullRequests(client, github.context, inputs);
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
    haltFile && "content" in haltFile ? atob(haltFile.content).trim() : null;

  if (!haltFileContents) {
    // Not in halted state
    return await unhaltPullRequest(client, github.context, inputs, pullRequest);
  }

  const changes = await getChangesInPullRequest(
    client,
    github.context,
    pullRequest
  );

  if (changes.removals.includes(inputs.haltFile)) {
    // Halted state, but removed in this PR
    return await unhaltPullRequest(client, github.context, inputs, pullRequest);
  }

  await haltPullRequest(
    client,
    github.context,
    inputs,
    pullRequest,
    haltFileContents === "" ? "Merges halted" : haltFileContents
  );
}

async function haltOpenPullRequests(
  client: GitHubClient,
  context: Context,
  inputs: Inputs,
  description: string
): Promise<void> {
  const pullRequests = await githubApi.listRepositoryPullRequests(client, {
    ...context.repo,
    state: "open",
  });

  await pullRequests.forEach(async (pullRequest) => {
    await haltPullRequest(client, context, inputs, pullRequest, description);
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
  description: string
): Promise<void> {
  console.info(`Setting halted status for PR #${pullRequest.number}`);
  await githubApi.createCommitStatus(client, {
    ...context.repo,
    sha: pullRequest.head.sha,
    context: inputs.statusContext,
    state: "failure",
    description,
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
  });
}

run();
