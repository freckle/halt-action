/* Typed interface for all GitHub API interactions */

import * as github from '@actions/github'
import {RestEndpointMethodTypes} from '@octokit/plugin-rest-endpoint-methods'

export type GitHubClient = ReturnType<typeof github.getOctokit>

export function getClient(token: string): GitHubClient {
  return github.getOctokit(token)
}

type CreateCommitStatusParameters =
  RestEndpointMethodTypes['repos']['createCommitStatus']['parameters']

type CreateCommitStatusResponse = RestEndpointMethodTypes['repos']['createCommitStatus']['response']

export async function createCommitStatus(
  client: GitHubClient,
  options: CreateCommitStatusParameters
): Promise<CreateCommitStatusResponse['data']> {
  const response = await client.rest.repos.createCommitStatus(options)
  return response.data
}

type ListRepositoryPullRequestsParameters = RestEndpointMethodTypes['pulls']['list']['parameters']

type ListRepositoryPullRequestsResponse = RestEndpointMethodTypes['pulls']['list']['response']

export async function listRepositoryPullRequests(
  client: GitHubClient,
  options: ListRepositoryPullRequestsParameters
): Promise<ListRepositoryPullRequestsResponse['data']> {
  return await client.paginate(client.rest.pulls.list, options)
}

type GetPullRequestFilesParameters = RestEndpointMethodTypes['pulls']['listFiles']['parameters']

type GetPullRequestFilesResponse = RestEndpointMethodTypes['pulls']['listFiles']['response']

export async function getPullRequestFiles(
  client: GitHubClient,
  options: GetPullRequestFilesParameters
): Promise<GetPullRequestFilesResponse['data']> {
  return await client.paginate(client.rest.pulls.listFiles, options)
}

type GetRepositoryContentParameters = RestEndpointMethodTypes['repos']['getContent']['parameters']

type GetRepositoryContentResponse = RestEndpointMethodTypes['repos']['getContent']['response']

export async function getRepositoryContent(
  client: GitHubClient,
  options: GetRepositoryContentParameters
): Promise<GetRepositoryContentResponse['data'] | null> {
  try {
    const response = await client.rest.repos.getContent(options)
    return response.data
  } catch {
    // Requested file doesn't exist
    return null
  }
}

type GetPullRequestParameters = RestEndpointMethodTypes['pulls']['get']['parameters']

type ListCommitStatusesResponse =
  RestEndpointMethodTypes['repos']['listCommitStatusesForRef']['response']

export async function getPullRequestStatuses(
  client: GitHubClient,
  options: GetPullRequestParameters
): Promise<ListCommitStatusesResponse['data']> {
  try {
    const {owner, repo} = options
    const {data: pr} = await client.rest.pulls.get(options)
    const {data: statuses} = await client.rest.repos.listCommitStatusesForRef({
      owner,
      repo,
      ref: pr.head.sha
    })

    return statuses
  } catch {
    return [] // don't care
  }
}
