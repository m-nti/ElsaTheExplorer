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
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 95,
        statements: 90,
      },
    },
  },
});
