import * as core from '@actions/core'
import * as github from '@actions/github'

import {getChangesInPullRequest, getChangesInPush, parseGitLog} from './changes.js'
import type {Context} from './context.js'
import type {GitHubClient} from './github-api.js'

const {getPullRequestFiles, execImpl} = vi.hoisted(() => {
  return {getPullRequestFiles: vi.fn(), execImpl: vi.fn()}
})

vi.mock(import('./github-api.js'), () => {
  return {getPullRequestFiles} as never
})

vi.mock(import('./exec.js'), () => {
  return {default: execImpl} as never
})

vi.mock(import('@actions/core'), () => {
  return {info: vi.fn(), warning: vi.fn()} as never
})

vi.mock(import('@actions/github'), () => {
  return {
    context: {payload: {}, repo: {owner: 'freckle', repo: 'halt-action'}}
  } as never
})

const context = {repo: {owner: 'freckle', repo: 'halt-action'}} as Context
const client = {} as GitHubClient
const pullRequest = {number: 42, head: {sha: 'abc123'}, labels: []}

beforeEach(() => {
  github.context.payload = {}
})

describe(parseGitLog.name, () => {
  it('ignores files that are added and deleted across the range', () => {
    // NB. ensures files deleted (or added) in commits then added (or deleted)
    // later, are handled correctly.
    const changes = parseGitLog(`
a95d0c7 (HEAD -> pb/first, origin/pb/first) More
M       README.md
A       package.json
D       src/github-api.ts
A       src/inputs.ts
M       src/main.ts
A       src/pull-request.ts
D       yarn-error.log
M       yarn.lock
1de6bb4 WIP
M       dist/index.js
D       package.json
A       src/github-api.ts
M       src/main.ts
M       package.json
6cf5d32 Update action.yml
M       action.yml
`)

    expect(changes.additions).toEqual(['package.json', 'src/inputs.ts', 'src/pull-request.ts'])
    expect(changes.removals).toEqual(['src/github-api.ts', 'yarn-error.log'])
  })
})

describe(getChangesInPush.name, () => {
  it('warns and reports no changes when the pre-push commit is unknown', async () => {
    const changes = await getChangesInPush('main')

    expect(core.warning).toHaveBeenCalledWith('Unable to determine commit before push')
    expect(changes).toEqual({additions: [], removals: []})
    expect(execImpl).not.toHaveBeenCalled()
  })

  it('diffs from the pre-push commit to HEAD', async () => {
    github.context.payload = {before: 'def456'}
    execImpl.mockResolvedValue({
      code: 0,
      stdout: 'A       .github/HALT\nD       old.txt\n',
      stderr: ''
    })

    const changes = await getChangesInPush('main')

    expect(execImpl).toHaveBeenCalledWith('git', [
      'diff',
      '--name-status',
      '--oneline',
      'def456..HEAD'
    ])
    expect(changes).toEqual({additions: ['.github/HALT'], removals: ['old.txt']})
  })

  it('deepens the fetch until the pre-push commit is found', async () => {
    github.context.payload = {before: 'def456'}
    execImpl
      .mockResolvedValueOnce({code: 0, stdout: '', stderr: ''}) // diff: not found yet
      .mockResolvedValueOnce({code: 0, stdout: '', stderr: ''}) // fetch --deepen
      .mockResolvedValueOnce({code: 0, stdout: 'A       .github/HALT\n', stderr: ''})

    const changes = await getChangesInPush('main')

    expect(execImpl).toHaveBeenCalledWith('git', ['fetch', '--deepen=10', 'origin', 'main'])
    expect(changes).toEqual({additions: ['.github/HALT'], removals: []})
  })

  it('gives up rather than deepening forever', async () => {
    github.context.payload = {before: 'def456'}
    execImpl.mockResolvedValue({code: 0, stdout: '', stderr: ''})

    const changes = await getChangesInPush('main')

    expect(core.warning).toHaveBeenCalledWith('Not found at 1,000 commits, giving up')
    expect(changes).toEqual({additions: [], removals: []})
  })
})

describe(getChangesInPullRequest.name, () => {
  it('splits the pull request files into additions and removals', async () => {
    getPullRequestFiles.mockResolvedValue([
      {filename: '.github/HALT', status: 'added'},
      {filename: 'README.md', status: 'modified'},
      {filename: 'old.txt', status: 'removed'},
      {filename: 'moved.txt', status: 'renamed'}
    ])

    const changes = await getChangesInPullRequest(client, context, pullRequest)

    expect(getPullRequestFiles).toHaveBeenCalledWith(client, {
      owner: 'freckle',
      repo: 'halt-action',
      pull_number: 42
    })
    expect(changes).toEqual({additions: ['.github/HALT'], removals: ['old.txt']})
  })

  it('reports no changes for an empty pull request', async () => {
    getPullRequestFiles.mockResolvedValue([])

    const changes = await getChangesInPullRequest(client, context, pullRequest)

    expect(changes).toEqual({additions: [], removals: []})
  })
})
