import * as core from "@actions/core";

export type Inputs = {
  defaultBranch: string;
  haltBranch: string | undefined;
  haltFile: string;
  statusContext: string;
  statusTargetUrl: string | undefined;
  slackWebhook: string | undefined;
  slackChannels: string[] | undefined;
  githubToken: string;
};

export function getInputs(): Inputs {
  return {
    defaultBranch: core.getInput("default-branch", { required: true }),
    haltBranch: core.getInput("halt-branch", { required: false }),
    haltFile: core.getInput("halt-file", { required: true }),
    statusContext: core.getInput("status-context", { required: true }),
    statusTargetUrl: core.getInput("status-target-url", { required: false }),
    slackWebhook: core.getInput("slack-webhook", { required: false }),
    slackChannels: core.getMultilineInput("slack-channels", {
      required: false,
    }),
    githubToken: core.getInput("github-token", { required: true }),
  };
}
