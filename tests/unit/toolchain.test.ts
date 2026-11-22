import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
const pkg = JSON.parse(
  readFileSync(fileURLToPath(new URL("../../package.json", import.meta.url)), "utf8"),
) as { scripts: Record<string, string> };

describe("toolchain (#45)", () => {
  it("runs the native TypeScript 7 compiler by path, not by install order", () => {
    // `@typescript/native` and `typescript` both declare `bin.tsc`; `.bin/tsc` is
    // whichever npm links last. The gate must name the compiler it means.
    expect(pkg.scripts["check:ts"]).toContain("node_modules/@typescript/native/bin/tsc");
  });

  it("fails `prepare` when panda codegen fails, without a shell-only grouping", () => {
    // `a && b || true` swallows a failing `a`. The brace fix `{ b || true; }` is
    // bash-only: npm runs lifecycle scripts through cmd.exe on Windows, where
    // `{` is not a command (verified: `cmd /c "echo a && { echo b || true; }"`
    // exits 1). The group is a Node script so every shell runs the same thing.
    expect(pkg.scripts.prepare).toBe("panda codegen && node scripts/git-hooks.mjs");
  });

  it("configures the hook path from a plain `npm run prepare`", () => {
    const result = spawnSync(process.execPath, ["scripts/git-hooks.mjs"], {
      cwd: repoRoot,
      encoding: "utf8",
    });
    expect(result.status).toBe(0);
  });
});
