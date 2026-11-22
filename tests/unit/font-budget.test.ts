import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

// One source of path truth: this file's own location, resolved with `node:path`.
// `new URL("../..", …)` yields a root with a trailing separator (a URL's spelling,
// not a filesystem path) and a POSIX literal is unresolvable on Windows; both are
// #104. Every path below is built by `join`/`resolve` from `here`.
const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..", "..");
const script = join(root, "scripts", "font-budget.mjs");
const manifest = JSON.parse(readFileSync(join(root, "scripts", "fonts.json"), "utf8"));

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

function run(target: string, gate = script) {
  const result = spawnSync(process.execPath, [gate, target], { cwd: root, encoding: "utf8" });
  expect(result.error).toBeUndefined();

  // A child that never loaded the gate also exits 1, so `expect(status).toBe(1)`
  // would read a crash as "the budget failed". That is how #104 was diagnosed as
  // a fixture-path bug when the real message was `ERR_MODULE_NOT_FOUND`. Name it.
  const verdict = gateVerdict(result.stderr);
  expect(verdict.started, verdict.started ? "" : `${verdict.detail}\n\n${result.stderr}`).toBe(true);
  return result;
}

type Verdict = { started: boolean; detail: string };

/**
 * Classify a gate run by its stderr: did the gate execute, or did the child die
 * before any budget verdict (unresolvable dependency, wrong script path)?
 */
function gateVerdict(stderr: string): Verdict {
  const crash = /ERR_MODULE_NOT_FOUND|ERR_PACKAGE_PATH_NOT_EXPORTED|Cannot find (?:package|module)/.exec(
    stderr,
  );
  if (crash) {
    return {
      started: false,
      detail: `the font gate could not start (${crash[0]}) — run \`npm ci\` so fontverter and harfbuzzjs are installed`,
    };
  }
  return { started: true, detail: "" };
}

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("gate harness", () => {
  it("reads a module-resolution crash as 'did not start', not as a budget verdict", () => {
    const crash = [
      "Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'fontverter' imported",
      "  from C:\\work\\scripts\\font-budget.mjs",
      "    at Object.getPackageJSONURL (node:internal/modules/package_json_reader:343:9)",
    ].join("\n");

    expect(gateVerdict(crash)).toEqual({
      started: false,
      detail: expect.stringContaining("npm ci"),
    });
    expect(gateVerdict("font-budget: public/fonts/chivo-latin.woff2 is 33,252 B over the ceiling")).toEqual({
      started: true,
      detail: "",
    });
  });
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
    const result = run(root);
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);

    for (const font of manifest.fonts) {
      expect(statSync(join(root, font.file)).size).toBeLessThanOrEqual(manifest.budgetBytes);
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
