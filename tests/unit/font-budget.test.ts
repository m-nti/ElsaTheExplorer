import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const script = fileURLToPath(new URL("../../scripts/font-budget.mjs", import.meta.url));
const repo = fileURLToPath(new URL("../..", import.meta.url));
const manifest = JSON.parse(readFileSync(join(repo, "scripts/fonts.json"), "utf8"));

const dirs: string[] = [];

type Fixture = {
  budgetBytes?: number;
  fonts?: Array<Record<string, unknown>>;
  shipped?: Record<string, number>;
};

/** A throwaway root with a font manifest and byte-sized placeholder fonts. */
function fixture({
  budgetBytes = 30000,
  fonts = [{ id: "chivo", file: "public/fonts/chivo-latin.woff2" }],
  shipped = { "chivo-latin.woff2": 33252 },
}: Fixture = {}): string {
  const dir = mkdtempSync(join(tmpdir(), "font-budget-"));
  dirs.push(dir);
  mkdirSync(join(dir, "scripts"), { recursive: true });
  mkdirSync(join(dir, "public", "fonts"), { recursive: true });
  writeFileSync(join(dir, "scripts", "fonts.json"), JSON.stringify({ budgetBytes, fonts, corpus: [] }));
  for (const [name, bytes] of Object.entries(shipped)) {
    writeFileSync(join(dir, "public", "fonts", name), Buffer.alloc(bytes));
  }
  return dir;
}

function run(root: string) {
  return spawnSync(process.execPath, [script, root], { encoding: "utf8" });
}

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("font byte budget", () => {
  it("fails at the 33,252 B Chivo the ticket measured (10.8 % over)", () => {
    const result = run(fixture());
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("33,252 B");
    expect(result.stderr).toContain("10.8 %");
    expect(result.stderr).toContain("30,000 B ceiling");
  });

  it("passes at exactly the ceiling and fails one byte over", () => {
    expect(run(fixture({ shipped: { "chivo-latin.woff2": 30000 } })).status).toBe(0);
    expect(run(fixture({ shipped: { "chivo-latin.woff2": 30001 } })).status).toBe(1);
  });

  it("fails when a shipped font is not declared, so a new font cannot dodge the ceiling", () => {
    const result = run(
      fixture({
        fonts: [{ id: "chivo", file: "public/fonts/chivo-latin.woff2" }],
        shipped: { "chivo-latin.woff2": 1000, "sneaky-latin.woff2": 40000 },
      }),
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("public/fonts/sneaky-latin.woff2 is shipped but not declared");
  });

  it("fails when a declared font is missing", () => {
    const result = run(
      fixture({
        fonts: [
          { id: "chivo", file: "public/fonts/chivo-latin.woff2" },
          { id: "ghost", file: "public/fonts/ghost-latin.woff2" },
        ],
      }),
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("public/fonts/ghost-latin.woff2 is declared but missing");
  });
});

describe("shipped fonts", () => {
  it("keeps every font in public/fonts at or under the 30,000 B ceiling", () => {
    const result = run(repo);
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);

    for (const font of manifest.fonts) {
      expect(statSync(join(repo, font.file)).size).toBeLessThanOrEqual(manifest.budgetBytes);
    }
  });

  it("declares a repertoire that covers the shipped DE/EN corpus", () => {
    // The gate itself scans index.html, src/ and the captions against the font's
    // cmap; a missing glyph is a red build there. This test pins the intent: the
    // corpus is configured for the Chivo face, which sets the UI text.
    const chivo = manifest.fonts.find((font: { id: string }) => font.id === "chivo");
    expect(chivo.corpusCheck).toBe(true);
    expect(manifest.corpus).toEqual(
      expect.arrayContaining(["index.html", "src", "photos/captions.json"]),
    );
  });
});
