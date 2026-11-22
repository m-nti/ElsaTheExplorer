import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";

const here = (path: string): string => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      $lib: here("./src/lib"),
      "@tokens": here("./design/tokens/tokens.ts"),
      "@tokens/": here("./design/tokens/"),
      "styled-system": here("./styled-system"),
    },
  },
  test: {
    projects: [
      {
        test: {
          name: "unit",
          include: ["tests/unit/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        test: {
          name: "canon",
          include: ["tests/canon/**/*.test.mjs"],
          environment: "node",
        },
      },
    ],
    reporters: ["default"],
    sequence: { shuffle: true },
    coverage: {
      provider: "v8",
      include: ["src/lib/domain/**", "src/lib/stores/**", "design/tokens/**"],
      // Ratchet floor measured at B1 (the v2 targets are 90/90/95/90 in
      // docs/test-plan.md §5). Raise with #23; never lower.
      thresholds: {
        lines: 61,
        functions: 50,
        branches: 44,
        statements: 58,
      },
    },
  },
});
