/**
 * table-integrity — gate tests.
 *
 * The gate's exit code is the contract, so every case spawns the CLI. The two
 * fixtures are the seeded cases: `tables-seeded` must fail and must name the
 * `file:line` plus both field counts; `tables-clean` must not be fooled by
 * escaped pipes, a missing trailing pipe, or a broken example inside a fence.
 * The last case runs the gate against this repo, so a new misaligned row in
 * `docs/` or `design/` fails CI on the commit that introduces it (issue #29,
 * lesson L-003).
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../..");
const script = join(repoRoot, "scripts/table-integrity.mjs");

/** Run the gate and return exit code plus stderr (the human-readable report). */
function run(argv) {
  const result = spawnSync(process.execPath, [script, ...argv], {
    encoding: "utf8",
    cwd: repoRoot,
  });
  return { code: result.status, stderr: result.stderr, stdout: result.stdout };
}

function fixture(name) {
  const { code, stdout } = run(["--json", "--root", join(here, "fixtures", name)]);
  return { code, report: stdout.trim() === "" ? null : JSON.parse(stdout) };
}

describe("table-integrity: seeded failure", () => {
  it("reports every misaligned row with its line and both field counts", () => {
    const { code, report } = fixture("tables-seeded");
    expect(code).toBe(1);
    expect(report.status).toBe("violations");
    expect(report.violations).toEqual([
      expect.objectContaining({
        file: "tests/canon/fixtures/tables-seeded/bad.md",
        line: 6,
        expected: 2,
        actual: 3,
      }),
      expect.objectContaining({
        file: "tests/canon/fixtures/tables-seeded/bad.md",
        line: 10,
        expected: 3,
        actual: 2,
      }),
    ]);
  });

  it("prints file:line and expected/actual to stderr", () => {
    const { code, stderr } = run(["--root", join(here, "fixtures", "tables-seeded")]);
    expect(code).toBe(1);
    expect(stderr).toContain("bad.md:6: expected 2 field(s), found 3");
    expect(stderr).toContain("bad.md:10: expected 3 field(s), found 2");
  });
});

describe("table-integrity: what it must not flag", () => {
  it("accepts escaped pipes, a missing trailing pipe and a fenced example", () => {
    const { code, report } = fixture("tables-clean");
    expect(code).toBe(0);
    expect(report.status).toBe("clean");
    expect(report.violations).toEqual([]);
  });

  it("exits 2 on a root that does not exist instead of reporting clean", () => {
    const { code, stderr } = run(["--root", join(here, "fixtures", "no-such-root")]);
    expect(code).toBe(2);
    expect(stderr).toContain("root does not exist");
  });
});

describe("table-integrity: this repository", () => {
  it("has no misaligned row in docs/ or design/", () => {
    const { code, report } = repoReport();
    expect(code).toBe(0);
    expect(report.status).toBe("clean");
    expect(report.tables).toBeGreaterThan(100);
  });
});

/** Gate the repository itself (no `--root`, so the default roots apply). */
function repoReport() {
  const { code, stdout } = run(["--json"]);
  return { code, report: stdout.trim() === "" ? null : JSON.parse(stdout) };
}
