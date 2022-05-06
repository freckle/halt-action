import { parseGitLog } from "./changes";

test("parseGitLog", async () => {
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
`);

  expect(changes.additions).toEqual([
    "package.json",
    "src/inputs.ts",
    "src/pull-request.ts",
  ]);
  expect(changes.removals).toEqual(["src/github-api.ts", "yarn-error.log"]);
});
