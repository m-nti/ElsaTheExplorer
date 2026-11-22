import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const pkg = JSON.parse(
  readFileSync(fileURLToPath(new URL("../../package.json", import.meta.url)), "utf8"),
) as { scripts: Record<string, string> };

describe("toolchain (#45)", () => {
  it("runs the native TypeScript 7 compiler by path, not by install order", () => {
    // `@typescript/native` and `typescript` both declare `bin.tsc`; `.bin/tsc` is
    // whichever npm links last. The gate must name the compiler it means.
    expect(pkg.scripts["check:ts"]).toContain("node_modules/@typescript/native/bin/tsc");
  });

  it("fails `prepare` when panda codegen fails", () => {
    // `a && b || true` swallows a failing `a`; the grouped form does not.
    expect(pkg.scripts.prepare).toMatch(/panda codegen && \{.*\|\| true;?\s*\}/);
  });
});
