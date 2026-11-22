import js from "@eslint/js";
import globals from "globals";

export default [
  {
    ignores: ["demo/**", "qa-shots/**", "assets/vendor/**", "node_modules/**", "photos/**"],
  },
  js.configs.recommended,
  {
    files: ["assets/**/*.js", "scripts/**/*.mjs"],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", caughtErrors: "none" }],
      "no-console": "off",
    },
  },
];
