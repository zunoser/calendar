import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["**/*.integration.test.ts"],
    exclude: [...configDefaults.exclude, ".direnv/**"],
    testTimeout: 30_000,
  },
});
