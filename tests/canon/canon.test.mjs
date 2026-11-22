/**
 * canon-check — gate tests.
 *
 * The gate is a CLI whose exit code is the contract, so every case spawns it and
 * asserts (exit code, parsed report). The fixtures under `fixtures/` are the
 * seeded failures; the last case runs the gate against this repo, so any new
 * canon drift in `design/ docs/ src/ AGENTS.md PRD.md README.md index.html`
 * fails CI.
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../..");
const script = join(repoRoot, "scripts/canon-check.mjs");

/** Run the gate and return exit code plus the parsed JSON report. */
function run(argv) {
  const result = spawnSync(process.execPath, [script, "--json", ...argv], {
    encoding: "utf8",
    cwd: repoRoot,
  });
  const parsed = result.stdout.trim() === "" ? null : JSON.parse(result.stdout);
  return { code: result.status, report: parsed, stderr: result.stderr };
}

function fixture(name, extra = []) {
  return run(["--root", join(here, "fixtures", name), ...extra]);
}

describe("canon-check: seeded failure", () => {
  it("flags every forbidden family and exits 1", () => {
    const { code, report } = fixture("seeded");
    expect(code).toBe(1);
    expect(report.status).toBe("violations");
    const rules = new Set(report.violations.map((violation) => violation.rule));
    expect(rules).toEqual(
      new Set([
        "entity-de",
        "entity-en",
        "verb-de",
        "verb-en",
        "heft",
        "water-de",
        "water-en",
        "bang",
      ]),
    );
    expect(
      report.violations.some(
        (violation) => violation.file === "src/copy.ts" && violation.rule === "entity-de",
      ),
    ).toBe(true);
  });

  it("reports file, line and rule for every hit", () => {
    const { report } = fixture("seeded");
    for (const violation of report.violations) {
      expect(violation.file).toMatch(/\.(md|ts)$/);
      expect(violation.line).toBeGreaterThan(0);
      expect(violation.column).toBeGreaterThan(0);
      expect(violation.rule).toBeTruthy();
    }
  });
});

describe("canon-check: clean run", () => {
  it("passes a corpus that only uses the archival concept and key names", () => {
    const { code, report } = fixture("clean");
    expect(code).toBe(0);
    expect(report.status).toBe("clean");
    expect(report.violations).toEqual([]);
  });

  it("passes the real repo", () => {
    const { code, report } = run([]);
    expect(code).toBe(0);
    expect(report.status).toBe("clean");
    expect(report.allowlist.baseline).toBeLessThanOrEqual(report.allowlist.maxBaseline);
  });

  it("scans the page shell and the readme (D12)", () => {
    const { report } = run([]);
    expect(report.scanned).toContain("index.html");
    expect(report.scanned).toContain("README.md");
    expect(report.scanned).toHaveLength(report.files);
  });
});

describe("canon-check: scanned surfaces (D12)", () => {
  it("reads index.html: a copy attribute and a text node are both live", () => {
    const { code, report } = fixture("unscanned-surface");
    expect(code).toBe(1);
    const hits = report.violations.filter((violation) => violation.file === "index.html");
    // Two distinct lines: the <meta content> value and the <h1> text node. One
    // hit would prove only that the file is opened, not that both surfaces are
    // read — the half-scanned surface is the blind spot this closes.
    expect(new Set(hits.map((violation) => violation.line)).size).toBeGreaterThan(1);
    expect(hits.every((violation) => violation.rule === "entity-de")).toBe(true);
    expect(hits.map((violation) => violation.term)).toContain("Kartenkatalog");
  });

  it("leaves markup that is not copy alone — ids, class hooks, attributes", () => {
    const { code, report } = fixture("clean");
    expect(code).toBe(0);
    expect(report.scanned).toContain("index.html");
  });
});

describe("canon-check: compound naming (D12)", () => {
  it("flags a German compound the `\\bKatalog\\b` rule could not reach", () => {
    const { code, report } = fixture("compound-de");
    expect(code).toBe(1);
    const terms = report.violations
      .filter((violation) => violation.rule === "entity-de")
      .map((violation) => violation.term);
    expect(terms).toContain("Kartenkatalog");
    expect(terms).toContain("Kartenkataloges");
  });

  it('flags the English compound `cardcatalogue`', () => {
    const { code, report } = fixture("compound-en");
    expect(code).toBe(1);
    const terms = report.violations
      .filter((violation) => violation.rule === "entity-en")
      .map((violation) => violation.term);
    expect(terms).toContain("cardcatalogue");
    expect(terms).toContain("archivecatalogue");
  });

  it("keeps the bare word case-insensitive (no regression from main)", () => {
    const { code, report } = fixture("case-forms");
    expect(code).toBe(1);
    const terms = report.violations
      .filter((violation) => violation.rule === "entity-en")
      .map((violation) => violation.term);
    expect(terms).toContain("CataLog");
    expect(terms).toContain("cataLOGUE");
  });
});

describe("canon-check: HTML embedded regions", () => {
  it("ignores script, style and comment bodies — and still catches the copy beside them", () => {
    const { code, report } = fixture("embedded");
    expect(code).toBe(1);
    // Exactly one hit: the <p> a visitor reads. The selector in <style>, the
    // `const catalog` and the water word inside <script>, and both comments
    // (one of them containing `>`) must all be silent.
    expect(report.violations).toHaveLength(1);
    const [only] = report.violations;
    expect(only.rule).toBe("entity-de");
    expect(only.term).toBe("Katalog");
    const source = readFileSync(join(here, "fixtures", "embedded", "index.html"), "utf8");
    const copyLine = source.split("\n").findIndex((line) => line.includes("kein Sammelwerk")) + 1;
    expect(only.line).toBe(copyLine);
  });

  it("reads every copy-bearing attribute", () => {
    const { code, report } = fixture("copy-attributes");
    expect(code).toBe(1);
    // <title> text node, alt, aria-label, placeholder, title, value.
    expect(report.violations).toHaveLength(6);
    expect(new Set(report.violations.map((violation) => violation.line)).size).toBe(6);
    expect(new Set(report.violations.map((violation) => violation.rule))).toEqual(
      new Set(["entity-de", "entity-en"]),
    );
  });
});

describe("canon-check: allowlist discipline", () => {
  it("excuses exactly one reasoned line", () => {
    const { code, report } = fixture("allowlisted");
    expect(code).toBe(0);
    expect(report.allowlist.allowed).toBe(1);
    expect(report.allowlist.baseline).toBe(0);
  });

  it("fails a stale entry — the allowlist must not outlive the text", () => {
    const { code, report } = fixture("stale");
    expect(code).toBe(2);
    expect(report.status).toBe("error");
    expect(report.errors.join("\n")).toMatch(/stale allowlist entry/);
  });

  it("fails a baseline entry that names no tracking issue", () => {
    const { code, report } = fixture("no-issue");
    expect(code).toBe(2);
    expect(report.status).toBe("error");
  });

  it("rejects an entry without a reason", () => {
    const { code, report } = fixture("no-reason");
    expect(code).toBe(2);
    expect(report.status).toBe("error");
    expect(report.errors.join("\n")).toMatch(/needs a reason/);
  });
});

describe("canon-check: baseline ratchet", () => {
  it("warns but passes by default", () => {
    const { code, report } = fixture("baseline");
    expect(code).toBe(0);
    expect(report.allowlist.baseline).toBe(1);
    expect(report.allowlist.baselineHits).toBeGreaterThan(0);
  });

  it("fails under --strict", () => {
    const { code } = fixture("baseline", ["--strict"]);
    expect(code).toBe(1);
  });

  it("fails when the baseline grows past maxBaseline", () => {
    const { code, report } = fixture("overcap");
    expect(code).toBe(1);
    expect(report.violations.some((violation) => violation.rule === "baseline")).toBe(true);
  });
});
