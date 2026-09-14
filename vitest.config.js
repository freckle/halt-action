import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    mockReset: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      // all + include: report every src file, not just ones a test loaded
      all: true,
      include: ["src/**/*.ts"],
      // main.ts holds the action's whole control flow; the integration CI job
      // exercises it end-to-end, so it is not unit-tested here
      exclude: ["src/main.ts"],
      // Set to the coverage the current tests actually achieve, so nothing
      // regresses. Raised as tests are added.
      thresholds: {
        lines: 35,
        branches: 72,
        functions: 30,
        statements: 35,
      },
    },
  },
});
