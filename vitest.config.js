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
      // The template's gate. Actual coverage is 98.8% lines / 100% branches;
      // 70 leaves room to refactor without silently allowing a collapse.
      thresholds: {
        lines: 70,
        branches: 70,
        functions: 70,
        statements: 70,
      },
    },
  },
});
