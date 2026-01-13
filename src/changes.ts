/*
 * Adapted from dorny/paths-filter
 *
 * https://github.com/dorny/paths-filter/blob/master/LICENSE
 *
 */

import * as core from "@actions/core";
import * as github from "@actions/github";

import type { Context } from "./context";
import exec from "./exec";
import type { GitHubClient } from "./github-api";
import * as githubApi from "./github-api";
import type { PullRequest } from "./pull-request";

export type Changes = {
  additions: string[];
  removals: string[];
};

const emptyChanges: Changes = { additions: [], removals: [] };

export async function getChangesInPush(branch: string): Promise<Changes> {
  const base = github.context.payload.before;

  if (!base) {
    core.warning("Unable to determine commit before push");
    return emptyChanges;
  }

  const spec = `${base}..HEAD`;
  core.info(`Using changed files in ${spec}`);

  const depth = 10;
  const maxAttempts = 100; // if you do a 1,000 commit push I'm sorry

  let stdout = null;
  let attempts = 0;

  while (!(stdout = await gitDiff(spec))) {
    if (attempts > maxAttempts) {
      core.warning("Not found at 1,000 commits, giving up");
      return emptyChanges;
    }

    core.info(
      `Commit ${base} not found, fetching ${depth} more along ${branch}`,
    );
    await exec("git", ["fetch", `--deepen=${depth}`, "origin", branch]);
  }

  return parseGitLog(stdout);
}

async function gitDiff(spec: string): Promise<string | null> {
  try {
    const { stdout } = await exec("git", [
      "diff",
      "--name-status",
      "--oneline",
      spec,
    ]);

    return stdout;
  } catch {
    return null;
  }
}

// exported for testing
export function parseGitLog(stdout: string): Changes {
  const regexp = /^(?<mode>A|D)\s*(?<path>.*)$/;
  const additions = [] as string[];
  const removals = [] as string[];

  stdout
    .trim()
    .split(/\r?\n/)
    .forEach((ln) => {
      const m = regexp.exec(ln);
      const mode = m?.groups?.mode;
      const path = m?.groups?.path;

      if (mode && path) {
        switch (mode) {
          case "A":
            if (!removals.includes(path)) {
              additions.push(path);
            }
            break;
          case "D":
            if (!additions.includes(path)) {
              removals.push(path);
            }
            break;
        }
      }
    });

  return { additions, removals };
}

export async function getChangesInPullRequest(
  client: GitHubClient,
  context: Context,
  pullRequest: PullRequest,
): Promise<Changes> {
  const changes = await githubApi.getPullRequestFiles(client, {
    ...context.repo,
    pull_number: pullRequest.number,
  });

  const additions = [] as string[];
  const removals = [] as string[];

  changes.forEach((change) => {
    switch (change.status) {
      case "added":
        additions.push(change.filename);
        break;
      case "removed":
        removals.push(change.filename);
        break;
    }
  });

  return { additions, removals };
}
