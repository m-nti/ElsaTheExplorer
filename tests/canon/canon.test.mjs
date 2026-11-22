/**
 * canon-check — gate tests.
 *
 * The gate is a CLI whose exit code is the contract, so every case spawns it and
 * asserts (exit code, parsed report). The fixtures under `fixtures/` are the
 * seeded failures; the last case runs the gate against this repo, so any new
 * canon drift in `design/ docs/ src/ PRD.md AGENTS.md` fails CI.
 */
import { spawnSync } from "node:child_process";
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
      new Set(["entity-de", "entity-en", "verb-en", "heft", "water-de", "water-en", "bang"]),
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
