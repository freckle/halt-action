export type Inputs = {
  defaultBranch: string;
  haltFile: string;
  statusContext: string;
  statusTargetUrl: string | undefined;
  githubToken: string;
};

// TODO
export function getInputs(): Inputs {
  return {
    defaultBranch: "main",
    haltFile: ".github/HALT",
    statusContext: "halt",
    statusTargetUrl: undefined,
    githubToken: "",
  };
}
