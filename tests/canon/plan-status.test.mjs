/**
 * plan-status — gate tests.
 *
 * A plan is the argument a reviewer reads before the code. When it says "in
 * review" for a PR that merged three commits ago, the reader is told to wait for
 * something that already happened (issue #61 §2). The gate's exit code is the
 * contract, so every case spawns the CLI.
 *
 * The network is never in this suite: the merged/open set arrives through
 * `--prs`, and the degrade path is proven by pointing `--gh` at a name that does
 * not exist — CI runs with `permissions: contents: read` and no token, so a red
 * gate there would only teach people to skip the check.
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../..");
const script = join(repoRoot, "scripts/plan-status.mjs");
const prs = join(here, "fixtures", "plan-status-prs.json");

function run(argv) {
  const result = spawnSync(process.execPath, [script, ...argv], {
    encoding: "utf8",
    cwd: repoRoot,
  });
  return { code: result.status, stdout: result.stdout, stderr: result.stderr };
}

function report(name) {
  const { code, stdout } = run(["--json", "--prs", prs, "--root", join(here, "fixtures", name)]);
  return { code, report: stdout.trim() === "" ? null : JSON.parse(stdout) };
}

describe("plan-status: seeded mismatch", () => {
  it("fails a plan that says in review for a merged PR, and merged for an open one", () => {
    const { code, report: result } = report("plan-status-seeded");
    expect(code).toBe(1);
    expect(result.status).toBe("mismatch");
    expect(result.violations).toEqual([
      {
        file: "tests/canon/fixtures/plan-status-seeded/plan.md",
        line: 5,
        pr: 501,
        claim: "review",
        actual: "merged",
      },
      {
        file: "tests/canon/fixtures/plan-status-seeded/plan.md",
        line: 6,
        pr: 502,
        claim: "merged",
        actual: "open",
      },
    ]);
  });

  it("prints file:line with both states", () => {
    const { code, stderr } = run(["--root", join(here, "fixtures", "plan-status-seeded"), "--prs", prs]);
    expect(code).toBe(1);
    expect(stderr).toContain('plan.md:5: PR #501 is merged but the plan says "in review"');
    expect(stderr).toContain('plan.md:6: PR #502 is open but the plan says "merged"');
  });
});

describe("plan-status: what it must not flag", () => {
  it("accepts a consistent plan and reads prose as prose", () => {
    const { code, report: result } = report("plan-status-clean");
    expect(code).toBe(0);
    expect(result.status).toBe("clean");
    expect(result.violations).toEqual([]);
    expect(result.mentions).toBe(5);
  });

  it("degrades to a warning, not a pass, when gh cannot be read", () => {
    const { code, stdout, stderr } = run([
      "--json",
      "--root",
      join(here, "fixtures", "plan-status-seeded"),
      "--gh",
      join(here, "fixtures", "no-such-gh"),
    ]);
    expect(code).toBe(0);
    expect(JSON.parse(stdout).status).toBe("skipped");
    expect(stderr).toContain("plan-status: WARNING");
  });

  it("exits 2 on a root that does not exist", () => {
    const { code, stderr } = run(["--root", join(here, "fixtures", "no-such-plan-root"), "--prs", prs]);
    expect(code).toBe(2);
    expect(stderr).toContain("plan root does not exist");
  });
});

describe("plan-status: this repository", () => {
  it("has no plan row that contradicts the merged log", () => {
    const { code, stdout } = run(["--json", "--prs", prs]);
    const result = JSON.parse(stdout);
    expect({ code, status: result.status }).toEqual({ code: 0, status: "clean" });
    expect(result.violations).toEqual([]);
    expect(result.mentions).toBeGreaterThan(5);
  });
});
