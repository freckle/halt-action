export type PullRequest = {
  number: number;
  head: {
    sha: string;
  };
  labels: Label[];
};

export type Label = {
  name: string;
};
