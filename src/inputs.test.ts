import * as core from '@actions/core'

import {getInputs} from './inputs.js'

vi.mock(import('@actions/core'), () => {
  return {
    getInput: vi.fn((name: string) => `_${name}_`),
    getMultilineInput: vi.fn((name: string) => [`_${name}_1`, `_${name}_2`])
  } as never
})

describe(getInputs.name, () => {
  it('maps every action input onto the Inputs record', () => {
    const inputs = getInputs()

    expect(inputs).toEqual({
      defaultBranch: '_default-branch_',
      haltBranch: '_halt-branch_',
      haltFile: '_halt-file_',
      ignoreLabels: ['_ignore-labels_1', '_ignore-labels_2'],
      statusContext: '_status-context_',
      statusTargetUrl: '_status-target-url_',
      slackWebhook: '_slack-webhook_',
      slackChannels: ['_slack-channels_1', '_slack-channels_2'],
      githubToken: '_github-token_'
    })
  })

  it('marks the inputs with action.yml defaults as required', () => {
    getInputs()

    for (const name of ['default-branch', 'halt-file', 'status-context', 'github-token']) {
      expect(core.getInput).toHaveBeenCalledWith(name, {required: true})
    }
  })

  it('marks the optional inputs as not required', () => {
    getInputs()

    expect(core.getInput).toHaveBeenCalledWith('halt-branch', {required: false})
    expect(core.getInput).toHaveBeenCalledWith('slack-webhook', {required: false})
    expect(core.getInput).toHaveBeenCalledWith('status-target-url', {required: false})
    expect(core.getMultilineInput).toHaveBeenCalledWith('ignore-labels', {required: false})
    expect(core.getMultilineInput).toHaveBeenCalledWith('slack-channels', {required: false})
  })
})
