import * as github from '@actions/github'

import type {GitHubClient} from './github-api.js'
import * as githubApi from './github-api.js'

vi.mock(import('@actions/github'), () => {
  return {getOctokit: vi.fn(() => '_octokit_')} as never
})

const repo = {owner: 'freckle', repo: 'halt-action'}

// The functions under test only touch the client members they need, so tests
// supply the narrowest fake that satisfies each call.
function fakeClient(client: unknown): GitHubClient {
  return client as GitHubClient
}

describe('getClient', () => {
  it('builds an Octokit client from the token', () => {
    const client = githubApi.getClient('_token_')

    expect(github.getOctokit).toHaveBeenCalledWith('_token_')
    expect(client).toEqual('_octokit_')
  })
})

describe('createCommitStatus', () => {
  it('returns the created status', async () => {
    const createCommitStatus = vi.fn().mockResolvedValue({data: {id: 1, state: 'failure'}})
    const client = fakeClient({rest: {repos: {createCommitStatus}}})
    const options = {...repo, sha: 'abc123', state: 'failure' as const}

    const status = await githubApi.createCommitStatus(client, options)

    expect(createCommitStatus).toHaveBeenCalledWith(options)
    expect(status).toEqual({id: 1, state: 'failure'})
  })
})

describe('listRepositoryPullRequests', () => {
  it('paginates over the pulls list endpoint', async () => {
    const list = vi.fn()
    const paginate = vi.fn().mockResolvedValue([{number: 1}, {number: 2}])
    const client = fakeClient({paginate, rest: {pulls: {list}}})
    const options = {...repo, state: 'open' as const}

    const pullRequests = await githubApi.listRepositoryPullRequests(client, options)

    expect(paginate).toHaveBeenCalledWith(list, options)
    expect(pullRequests).toEqual([{number: 1}, {number: 2}])
  })
})

describe('getPullRequestFiles', () => {
  it('paginates over the pull request files endpoint', async () => {
    const listFiles = vi.fn()
    const paginate = vi.fn().mockResolvedValue([{filename: '.github/HALT', status: 'added'}])
    const client = fakeClient({paginate, rest: {pulls: {listFiles}}})
    const options = {...repo, pull_number: 42}

    const files = await githubApi.getPullRequestFiles(client, options)

    expect(paginate).toHaveBeenCalledWith(listFiles, options)
    expect(files).toEqual([{filename: '.github/HALT', status: 'added'}])
  })
})

describe('getRepositoryContent', () => {
  it('returns the content when the file exists', async () => {
    const getContent = vi.fn().mockResolvedValue({data: {content: 'V2UncmUgZG93bg=='}})
    const client = fakeClient({rest: {repos: {getContent}}})
    const options = {...repo, path: '.github/HALT'}

    const content = await githubApi.getRepositoryContent(client, options)

    expect(getContent).toHaveBeenCalledWith(options)
    expect(content).toEqual({content: 'V2UncmUgZG93bg=='})
  })

  it('returns null when the file does not exist', async () => {
    const getContent = vi.fn().mockRejectedValue(new Error('Not Found'))
    const client = fakeClient({rest: {repos: {getContent}}})

    const content = await githubApi.getRepositoryContent(client, {...repo, path: '.github/HALT'})

    expect(content).toBeNull()
  })
})

describe('getPullRequestStatuses', () => {
  it('looks up the head sha then lists statuses for it', async () => {
    const get = vi.fn().mockResolvedValue({data: {head: {sha: 'abc123'}}})
    const listCommitStatusesForRef = vi
      .fn()
      .mockResolvedValue({data: [{context: 'halt', state: 'failure'}]})
    const client = fakeClient({
      rest: {pulls: {get}, repos: {listCommitStatusesForRef}}
    })
    const options = {...repo, pull_number: 42}

    const statuses = await githubApi.getPullRequestStatuses(client, options)

    expect(get).toHaveBeenCalledWith(options)
    expect(listCommitStatusesForRef).toHaveBeenCalledWith({...repo, ref: 'abc123'})
    expect(statuses).toEqual([{context: 'halt', state: 'failure'}])
  })

  it('returns no statuses when the lookup fails', async () => {
    const get = vi.fn().mockRejectedValue(new Error('Not Found'))
    const client = fakeClient({rest: {pulls: {get}, repos: {}}})

    const statuses = await githubApi.getPullRequestStatuses(client, {...repo, pull_number: 42})

    expect(statuses).toEqual([])
  })
})
