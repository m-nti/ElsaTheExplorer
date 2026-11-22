/**
 * check-paths — gate tests.
 *
 * The gate's exit code is the contract, so every case spawns the CLI, like
 * `tests/canon/table-integrity.test.mjs`. `paths-seeded` must fail and must name
 * the `file:line` of every stale reference — a moved link, a moved backtick, a
 * case-only difference in each family — and must stay quiet about a file nobody
 * has built yet and about the fenced example. `paths-clean` must not be fooled by
 * an anchor, a line suffix, a line set, a directory, a space, a template, a glob
 * or a `legacy/` archive. The last case runs the gate against this repository, so
 * a later move that leaves a reference behind fails CI on the commit that
 * introduces it (issue #61: moving `docs/action-plan.md` left three README links
 * pointing at a deleted file, and neither `canon` nor `ci-gates` could see it).
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../..");
const script = join(repoRoot, "scripts/check-paths.mjs");

/** Run the gate and return exit code plus the two report streams. */
function run(argv) {
  const result = spawnSync(process.execPath, [script, ...argv], {
    encoding: "utf8",
    cwd: repoRoot,
  });
  return { code: result.status, stdout: result.stdout, stderr: result.stderr };
}

function fixture(name) {
  const { code, stdout } = run(["--json", "--root", join(here, "fixtures", name)]);
  return { code, report: stdout.trim() === "" ? null : JSON.parse(stdout) };
}

/** The four fields a caller acts on; `elsewhere` is a hint, not the contract. */
const shape = (violations) =>
  violations.map(({ file, line, target, kind }) => ({ file, line, target, kind }));

describe("check-paths: seeded failure", () => {
  it("names every stale reference with its file and line", () => {
    const { code, report } = fixture("paths-seeded");
    expect(code).toBe(1);
    expect(report.status).toBe("violations");
    expect(shape(report.violations)).toEqual([
      { file: "tests/canon/fixtures/paths-seeded/broken.md", line: 3, target: "docs/action-plan.md", kind: "link" },
      { file: "tests/canon/fixtures/paths-seeded/broken.md", line: 5, target: "docs/action-plan.md", kind: "path" },
      { file: "tests/canon/fixtures/paths-seeded/broken.md", line: 7, target: "docs/EXISTS.md", kind: "path" },
      { file: "tests/canon/fixtures/paths-seeded/broken.md", line: 13, target: "Docs/exists.md", kind: "link" },
      { file: "tests/canon/fixtures/paths-seeded/broken.md", line: 20, target: "../elsewhere/deep.md", kind: "link" },
    ]);
  });

  it("explains where the moved file is, and ignores plans and fenced examples", () => {
    const { code, stderr } = run(["--root", join(here, "fixtures", "paths-seeded")]);
    expect(code).toBe(1);
    expect(stderr).toContain("broken.md:3: link docs/action-plan.md does not exist");
    expect(stderr).toContain("docs/archive/action-plan.md");
    expect(stderr).toContain("broken.md:13: link Docs/exists.md does not exist");
    expect(stderr).toContain("broken.md:20: link ../elsewhere/deep.md climbs out of the repository");
    expect(stderr).not.toContain("cachePolicy.ts");
    expect(stderr).not.toContain("gone-too.md");
    expect(stderr).not.toContain("design/never-there.md");
  });
});

describe("check-paths: what it must not flag", () => {
  it("accepts anchors, line suffixes, directories, spaces, templates and planned files", () => {
    const { code, report } = fixture("paths-clean");
    expect(code).toBe(0);
    expect(report.status).toBe("clean");
    expect(report.violations).toEqual([]);
    expect(report.notYet).toBe(1);
  });

  it("exits 2 on a root that does not exist instead of reporting clean", () => {
    const { code, stderr } = run(["--root", join(here, "fixtures", "no-such-root")]);
    expect(code).toBe(2);
    expect(stderr).toContain("root does not exist");
  });
});

describe("check-paths: this repository", () => {
  it("has no stale internal reference in a tracked Markdown file", () => {
    const { code, stdout } = run(["--json"]);
    const report = JSON.parse(stdout);
    expect(code).toBe(0);
    expect(report.status).toBe("clean");
    expect(report.files).toBeGreaterThan(10);
    expect(report.claims).toBeGreaterThan(50);
  });
});
