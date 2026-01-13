/* Typed interface for all GitHub API interactions */

import * as github from "@actions/github";
import { Endpoints } from "@octokit/types";

export type GitHubClient = ReturnType<typeof github.getOctokit>;

export function getClient(token: string): GitHubClient {
  return github.getOctokit(token);
}

type CreateCommitStatusParameters =
  Endpoints["POST /repos/{owner}/{repo}/statuses/{sha}"]["parameters"];

type CreateCommitStatusResponse =
  Endpoints["POST /repos/{owner}/{repo}/statuses/{sha}"]["response"];

export async function createCommitStatus(
  client: GitHubClient,
  options: CreateCommitStatusParameters,
): Promise<CreateCommitStatusResponse["data"]> {
  const response = await client.rest.repos.createCommitStatus(options);
  return response.data;
}

type ListRepositoryPullRequestsParameters =
  Endpoints["GET /repos/{owner}/{repo}/pulls"]["parameters"];

type ListRepositoryPullRequestsResponse =
  Endpoints["GET /repos/{owner}/{repo}/pulls"]["response"];

export async function listRepositoryPullRequests(
  client: GitHubClient,
  options: ListRepositoryPullRequestsParameters,
): Promise<ListRepositoryPullRequestsResponse["data"]> {
  return await client.paginate(client.rest.pulls.list, options);
}

type GetPullRequestFilesParameters =
  Endpoints["GET /repos/{owner}/{repo}/pulls/{pull_number}/files"]["parameters"];

type GetPullRequestFilesResponse =
  Endpoints["GET /repos/{owner}/{repo}/pulls/{pull_number}/files"]["response"];

export async function getPullRequestFiles(
  client: GitHubClient,
  options: GetPullRequestFilesParameters,
): Promise<GetPullRequestFilesResponse["data"]> {
  return await client.paginate(client.rest.pulls.listFiles, options);
}

type GetRepositoryContentParameters =
  Endpoints["GET /repos/{owner}/{repo}/contents/{path}"]["parameters"];

type GetRepositoryContentResponse =
  Endpoints["GET /repos/{owner}/{repo}/contents/{path}"]["response"];

export async function getRepositoryContent(
  client: GitHubClient,
  options: GetRepositoryContentParameters,
): Promise<GetRepositoryContentResponse["data"] | null> {
  try {
    const response = await client.rest.repos.getContent(options);
    return response.data;
  } catch {
    // Requested file doesn't exist
    return null;
  }
}

type GetPullRequestParameters =
  Endpoints["GET /repos/{owner}/{repo}/pulls/{pull_number}"]["parameters"];

type ListCommitStatusesResponse =
  Endpoints["GET /repos/{owner}/{repo}/commits/{ref}/statuses"]["response"];

export async function getPullRequestStatuses(
  client: GitHubClient,
  options: GetPullRequestParameters,
): Promise<ListCommitStatusesResponse["data"]> {
  try {
    const { owner, repo, pull_number } = options;
    const { data: pr } = await client.rest.pulls.get(options);
    const { data: statuses } = await client.rest.repos.listCommitStatusesForRef(
      {
        owner,
        repo,
        ref: pr.head.sha,
      },
    );

    return statuses;
  } catch {
    return []; // don't care
  }
}
