# Halt Action

Occasionally at Freckle, we need to ask Engineers to "halt the line" and hold
off on merging PRs for a moment while we work through an issue in the deployment
pipeline -- to avoid a series of merges piling up.

Historically, this would be an update to a Slack topic and hope that everyone
sees it. This Action is an experiment in improving that through automation.

## Usage

```yaml
name: Halt

on:
  pull_request:
  push:
    branches: main

jobs:
  check-halt-status:
    runs-on: ubuntu-latest
    steps:
      - if: ${{ github.event_name == 'push' }}
        uses: actions/checkout@v3 # needed for knowing changes in push

      - uses: freckle/halt-action@v1
        with: # all optional, defaults shown
          default-branch: main
          halt-file: .github/HALT
          status-context: halt
          status-target-url: null
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

## How it works

**When you need to halt the line**:

Commit a file to `main` at `.github/HALT`. The file can be blank, or contain
contents about why. The format for these contents is discussed later.

This Action will see this addition and flip all open PRs to red. When the action
runs on any PRs after that, as long as this file exists on `main`, those PRs
will receive a red status.

Make the configured `status-context` a _Required Status_ to actually "halt the
line".

**When you're ready to get moving**:

Remove the file from `main`. This Action will see this removal and flip all open
PRs to green. Typically, we'd do this in the same PR that fixes the issue (if it
was caused by our code), so that things naturally begin moving again when the
fix hits `main`.

## Halt File Contents

When a "halt file" exists, PRs will be halted. If the file is blank, a default
status description is used. However, if the file _does_ have content, the first
line will become the PR status description. The remaining lines, if there are
any, will be added as a [Workflow Job Summary][workflow-job-summary].

[workflow-job-summary]: https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions#adding-a-job-summary

## Inputs & Outputs

See [action.yml](./action.yml) for a complete list of inputs and outputs.

## Versioning

Versioned tags will exist, such as `v1.0.0` and `v2.1.1`. Branches will exist
for each major version, such as `v1` or `v2` and contain the newest version in
that series.

### Release Process

Given a latest version of v1.0.1,

Is this a new major version?

If yes,

```console
git checkout main
git pull
git checkout -b v2
git tag -s -m v2.0.0 v2.0.0
git push --follow-tags
```

Otherwise,

```console
git checkout main
git pull
git checkout v1
git merge --ff-only -
git tag -s -m v1.0.2 v1.0.2    # or v1.1.0
git push --follow-tags
```

---

[LICENSE](./LICENSE)
