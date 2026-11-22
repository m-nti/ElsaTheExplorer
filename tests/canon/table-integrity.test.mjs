/**
 * table-integrity — gate tests.
 *
 * The gate's exit code is the contract, so every case spawns the CLI. The two
 * fixtures are the seeded cases: `tables-seeded` must fail and must name the
 * `file:line` plus both field counts; `tables-orphaned` must fail on rows that
 * prose has detached from their header (#75); `tables-clean` must not be fooled
 * by escaped pipes, a missing trailing pipe, or a broken example inside a fence.
 * The quoted cases (#102) prove a table behind a blockquote marker is judged by
 * the same header contract, while a quoted fence or a depth change is not.
 * The last case runs the gate against this repo, so a new misaligned or
 * orphaned row in `docs/` or `design/` fails CI on the commit that introduces it
 * (issue #29, lesson L-003).
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

describe("table-integrity: rows orphaned by prose (issue #75)", () => {
  it("fails on a row that follows prose after a table header", () => {
    const { code, report } = fixture("tables-orphaned");
    expect(code).toBe(1);
    expect(report.status).toBe("violations");
    expect(report.violations[0]).toEqual(
      expect.objectContaining({
        file: "tests/canon/fixtures/tables-orphaned/bad.md",
        line: 14,
        kind: "orphan",
      }),
    );
  });

  it("names the first orphan row's file:line on stderr", () => {
    const { code, stderr } = run(["--root", join(here, "fixtures", "tables-orphaned")]);
    expect(code).toBe(1);
    expect(stderr).toContain("bad.md:14: orphaned table row");
  });
});

describe("table-integrity: what it must not flag", () => {
  it("accepts escaped pipes, a missing trailing pipe and a fenced example", () => {
    const { code, report } = fixture("tables-clean");
    expect(code).toBe(0);
    expect(report.status).toBe("clean");
    expect(report.violations).toEqual([]);
    // Four unquoted tables plus the clean blockquote table added for #102.
    expect(report.tables).toBe(5);
  });

  it("exits 2 on a root that does not exist instead of reporting clean", () => {
    const { code, stderr } = run(["--root", join(here, "fixtures", "no-such-root")]);
    expect(code).toBe(2);
    expect(stderr).toContain("root does not exist");
  });
});

describe("table-integrity: tables inside blockquotes (issue #102)", () => {
  it("reports a misaligned row inside a blockquote table", () => {
    const { code, report } = fixture("tables-quoted-bad");
    expect(code).toBe(1);
    expect(report.status).toBe("violations");
    expect(report.violations).toEqual([
      expect.objectContaining({
        file: "tests/canon/fixtures/tables-quoted-bad/bad.md",
        line: 9,
        kind: "misaligned",
        expected: 2,
        actual: 3,
      }),
    ]);
  });

  it("prints the quoted row's file:line and both field counts to stderr", () => {
    const { code, stderr } = run(["--root", join(here, "fixtures", "tables-quoted-bad")]);
    expect(code).toBe(1);
    expect(stderr).toContain("bad.md:9: expected 2 field(s), found 3");
  });

  it("fails on a quoted row detached from its quoted header", () => {
    const { code, report } = fixture("tables-quoted-orphaned");
    expect(code).toBe(1);
    expect(report.status).toBe("violations");
    expect(report.violations[0]).toEqual(
      expect.objectContaining({
        file: "tests/canon/fixtures/tables-quoted-orphaned/bad.md",
        line: 9,
        kind: "orphan",
      }),
    );
  });

  it("names the first quoted orphan row's file:line on stderr", () => {
    const { code, stderr } = run(["--root", join(here, "fixtures", "tables-quoted-orphaned")]);
    expect(code).toBe(1);
    expect(stderr).toContain("bad.md:9: orphaned table row");
  });

  it("counts a clean blockquote table and ignores a quoted fence", () => {
    const { code, report } = fixture("tables-clean");
    expect(code).toBe(0);
    expect(report.violations).toEqual([]);
    expect(report.tables).toBe(5);
  });
});

describe("table-integrity: this repository", () => {
  it("has no misaligned or orphaned row in docs/ or design/", () => {
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
