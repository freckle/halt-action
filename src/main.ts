import { includes, map, filter } from "lodash";
import * as fs from "fs";

import * as core from "@actions/core";
import * as github from "@actions/github";

import type { GitHubClient } from "./github-api";
import * as githubApi from "./github-api";

type Inputs = {
  defaultBranch: string;
  haltFile: string;
  statusContext: string;
  statusTargetUrl: string | undefined;
  githubToken: string;
};

async function run() {
  try {
    const inputs = {} as Inputs; // TODO
    const client = githubApi.getClient(inputs.githubToken);

    if (github.context.ref === inputs.defaultBranch) {
      const changes = await getChangesInPush();

      if (includes(changes.additions, inputs.haltFile)) {
        console.info("Halting all open PRs");
        const description = fs.readFileSync(inputs.haltFile).toString().trim();
        await haltOpenPRs(client, github.context, inputs, description);
      }

      if (includes(changes.removals, inputs.haltFile)) {
        console.info("Un-halting all open PRs");
        await unhaltOpenPRs(client, github.context, inputs);
      }

      return;
    }

    const pullRequest = github.context.payload.pullRequest;

    if (pullRequest) {
      const contents = await getHaltFileContents(
        client,
        github.context,
        inputs
      );

      if (contents) {
        const changes = await getChangesInPullRequest(client, pullRequest);

        if (!includes(changes.removals, inputs.haltFile)) {
          const description = contents === "" ? "Merges halted" : contents;
          console.info(`Setting halted status for PR #${pullRequest.number}`);
          await githubApi.createCommitStatus(client, {
            ...github.context.repo,
            sha: pullRequest.head.sha,
            context: inputs.statusContext,
            state: "failure",
            description,
            target_url: inputs.statusTargetUrl,
          });
          return;
        }
      }

      console.info(`Setting un-halted status for PR #${pullRequest.number}`);
      await githubApi.createCommitStatus(client, {
        ...github.context.repo,
        sha: pullRequest.head.sha,
        context: inputs.statusContext,
        state: "success",
      });
    }
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

type Changes = {
  additions: string[];
  removals: string[];
};

function additionsInclude(changes: Changes, path: string): boolean {
  return false;
}

function removalsInclude(changes: Changes, path: string): boolean {
  return false;
}

type RepoContext = { repo: { owner: string; repo: string } };

type PullRequestContext = RepoContext & {
  payload: { pullRequest: { number: number } };
};

async function getChangesInPush(): Promise<Changes> {
  return { additions: [], removals: [] }; // TODO
}

async function getChangesInPullRequest(
  client: GitHubClient,
  context: PullRequestContext
): Promise<Changes> {
  const changes = await githubApi.getPullRequestFiles(client, {
    ...context.repo,
    pull_number: context.payload.pullRequest.number,
  });

  return { additions: [], removals: [] }; // TODO
  // return {
  //   additions: map(
  //     filter(changes, (change) => (change.status = "added")),
  //     (change) => change.filename
  //   ),
  //   removals: map(
  //     filter(changes, (change) => (change.status = "removed")),
  //     (change) => change.filename
  //   ),
  // };
}

async function getHaltFileContents(
  client: GitHubClient,
  context: RepoContext,
  inputs: Inputs
): Promise<string | null> {
  const haltFile = await githubApi.getRepositoryContent(client, {
    ...github.context.repo,
    path: inputs.haltFile,
    ref: inputs.defaultBranch,
  });

  return haltFile && "content" in haltFile
    ? atob(haltFile.content).trim()
    : null;
}

async function haltOpenPRs(
  client: GitHubClient,
  context: RepoContext,
  inputs: Inputs,
  description: string
): Promise<void> {
  const pullRequests = await githubApi.listRepositoryPullRequests(client, {
    ...context.repo,
    state: "open",
  });

  await pullRequests.forEach(async (pullRequest) => {
    console.info(`Setting halted status for PR #${pullRequest.number}`);
    await githubApi.createCommitStatus(client, {
      ...context.repo,
      sha: pullRequest.head.sha,
      context: inputs.statusContext,
      state: "failure",
      description,
      target_url: inputs.statusTargetUrl,
    });
  });
}

async function unhaltOpenPRs(
  client: GitHubClient,
  context: RepoContext,
  inputs: Inputs
): Promise<void> {
  const pullRequests = await githubApi.listRepositoryPullRequests(client, {
    ...context.repo,
    state: "open",
  });

  await pullRequests.forEach(async (pullRequest) => {
    console.info(`Setting un-halted status for PR #${pullRequest.number}`);
    await githubApi.createCommitStatus(client, {
      ...context.repo,
      sha: pullRequest.head.sha,
      context: inputs.statusContext,
      state: "success",
    });
  });
}

run();
