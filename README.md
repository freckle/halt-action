# TypeScript Action Template

Our custom template repository for GitHub Actions implemented in TypeScript.

[Creating a repository from a template][docs].

[docs]: https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-repository-from-a-template

**NOTE**: Be sure to look for strings like "TODO" or "Action name" and update
them accordingly.

## Usage

```yaml
- uses: freckle/TODO-action@v1
```

## Inputs and Outputs

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
