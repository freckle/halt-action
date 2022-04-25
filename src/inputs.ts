import * as core from "@actions/core";

export type Inputs = {
  defaultBranch: string;
  haltFile: string;
  statusContext: string;
  statusTargetUrl: string | undefined;
  githubToken: string;
};

export function getInputs(): Inputs {
  return {
    defaultBranch: core.getInput("default-branch", { required: true }),
    haltFile: core.getInput("halt-file", { required: true }),
    statusContext: core.getInput("status-context", { required: true }),
    statusTargetUrl: core.getInput("status-target-url", { required: false }),
    githubToken: core.getInput("github-token", { required: true }),
  };
}
