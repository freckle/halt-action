import type { Context } from "./context";
import type { GitHubClient } from "./github-api";
import * as githubApi from "./github-api";
import type { PullRequest } from "./pull-request";

export type Changes = {
  additions: string[];
  removals: string[];
};

export async function getChangesInPush(): Promise<Changes> {
  return { additions: [], removals: [] }; // TODO
}

export async function getChangesInPullRequest(
  client: GitHubClient,
  context: Context,
  pullRequest: PullRequest
): Promise<Changes> {
  const changes = await githubApi.getPullRequestFiles(client, {
    ...context.repo,
    pull_number: pullRequest.number,
  });

  return { additions: [], removals: [] }; // TODO
}
