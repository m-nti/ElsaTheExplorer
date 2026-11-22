import { spawnSync } from "node:child_process";
import { rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import {
  FIXTURE_STEP_TIMEOUT_MS,
  FIXTURE_TEST_BUDGET_MS,
  findPosixShell,
  gitEnv,
  makeRepo,
  runStep,
  samePath,
} from "./support/git-fixture";

/** MSYS `sh` takes a forward-slash path; a POSIX host sees no change. */
const script = fileURLToPath(new URL("../../scripts/pre-push-refs.sh", import.meta.url)).replaceAll("\\", "/");
const zero = "0".repeat(40);
const dirs: string[] = [];

const shell = findPosixShell();
const shellReason = shell === null ? "no POSIX shell (sh or bash) on this host" : null;
if (shellReason !== null) console.warn(`[pre-push-refs] five hook tests skipped — ${shellReason}`);
/** Skip with a named reason instead of spawning a command that cannot exist here. */
const hookIt: typeof it =
  shell === null
    ? ((title: string, _fn: () => void) => it.skip(`${title} — skipped: ${shellReason}`, () => {})) as typeof it
    : it;

function repo() {
  const { dir, git } = makeRepo("prepush-");
  dirs.push(dir);
  return { dir, git, head: git("rev-parse", "HEAD").stdout.trim() };
}

function run(dir: string, head: string, stdin: string) {
  if (shell === null) throw new Error(`no POSIX shell to run the hook script: ${shellReason}`);
  return runStep(shell, [script, head], { cwd: dir, env: gitEnv(), input: stdin });
}

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("pre-push ref check", () => {
  hookIt("accepts a push of HEAD", () => {
    const { dir, head } = repo();
    const result = run(dir, head, `refs/heads/main ${head} refs/heads/main ${zero}\n`);
    expect(result.status).toBe(0);
  }, FIXTURE_TEST_BUDGET_MS);

  hookIt("refuses a ref that is not HEAD", () => {
    const { dir, git, head } = repo();
    const other = git("commit-tree", "-p", head, "-m", "two", "HEAD^{tree}").stdout.trim();
    const result = run(dir, head, `refs/heads/other ${other} refs/heads/other ${zero}\n`);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("only HEAD");
  }, FIXTURE_TEST_BUDGET_MS);

  hookIt("accepts an annotated tag that peels to HEAD", () => {
    const { dir, git, head } = repo();
    git("tag", "-a", "v1", "-m", "v1");
    const tag = git("rev-parse", "v1").stdout.trim();
    expect(tag).not.toBe(head);
    const result = run(dir, head, `refs/tags/v1 ${tag} refs/tags/v1 ${zero}\n`);
    expect(result.status).toBe(0);
  }, FIXTURE_TEST_BUDGET_MS);

  hookIt("accepts a lightweight tag", () => {
    const { dir, git, head } = repo();
    git("tag", "v1");
    const result = run(dir, head, `refs/tags/v1 ${head} refs/tags/v1 ${zero}\n`);
    expect(result.status).toBe(0);
  }, FIXTURE_TEST_BUDGET_MS);

  hookIt("ignores a deletion", () => {
    const { dir, head } = repo();
    const result = run(dir, head, `(delete) ${zero} refs/heads/gone ${head}\n`);
    expect(result.status).toBe(0);
  }, FIXTURE_TEST_BUDGET_MS);
});

describe("the fixture's own preconditions", () => {
  // Regression for #69: this is the comparison the five tests above stand on. It failed
  // on Windows because git answered with the long name and `realpathSync` with the 8.3
  // short one, so every test reported a hermeticity error before reaching the hook.
  it("treats every spelling of the fixture directory as the same directory", () => {
    const { dir, git } = repo();
    const toplevel = git("rev-parse", "--show-toplevel").stdout.trim();

    expect(samePath(toplevel, dir)).toBe(true);
    expect(samePath(dir.split("\\").join("/"), dir)).toBe(true);
    if (process.platform === "win32") expect(samePath(dir.toUpperCase(), dir)).toBe(true);

    // Still a guard: a sibling directory is not the fixture.
    expect(samePath(join(dir, ".."), dir), "a different directory must not compare equal").toBe(false);
  }, FIXTURE_TEST_BUDGET_MS);

  it("resolves a POSIX shell, or names the reason it cannot", () => {
    if (shell === null) {
      const reason = String(shellReason);
      console.warn(`[pre-push-refs] skipped with reason: ${reason}`);
      expect(reason).not.toBe("");
      return;
    }
    // PATH may hand back a bare name ("sh") or an absolute path (Git's sh.exe); what
    // matters is that it runs, not how it is spelled.
    expect(spawnSync(shell, ["-c", "exit 0"], { encoding: "utf8" }).status).toBe(0);
  }, FIXTURE_TEST_BUDGET_MS);

  // Regression for #111. These suites are spawn-bound: a fixture costs six to twelve
  // `git` processes, and each one is slow enough on Windows that CPU contention stretches
  // a whole test past Vitest's 5 s default. A test-level TestTimeoutError names nothing —
  // and because `spawnSync` blocks, it is reported only after the body returns, so the
  // suite "passes on rerun". The fixture therefore carries its own per-step deadline and
  // must say which step died.
  it("kills an overrunning step and names it instead of hanging", () => {
    const { dir } = repo();

    expect(() =>
      runStep(process.execPath, ["-e", "setInterval(() => {}, 1000)"], { cwd: dir, timeoutMs: 500 }),
    ).toThrow(/git-fixture: step `.*node.*` timed out after 500 ms/);
  }, FIXTURE_TEST_BUDGET_MS);

  // The test budget is a hang guard, not an assertion (#111). A step deadline at or above
  // it would let the test die first and lose the step name, so the ordering is contract.
  // Floor is the worst case measured on this host under 8-way CPU contention (188 s for the
  // heaviest ESLint case); 300 s keeps 1.6x over it and 30x the worst idle test.
  it("keeps every step deadline below the test budget, with headroom for contention", () => {
    expect(FIXTURE_STEP_TIMEOUT_MS).toBeLessThan(FIXTURE_TEST_BUDGET_MS);
    expect(FIXTURE_TEST_BUDGET_MS).toBeGreaterThanOrEqual(300_000);
  });
});
