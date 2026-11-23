import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

/**
 * Fixtures shared by the hook suites (`pre-push-refs`, `pre-commit-lint`).
 *
 * Every helper here exists for one host quirk — Git for Windows hides git's `sh` from a
 * PowerShell session, and answers with a long path where Node returns an 8.3 short one — so
 * the suites must not each rediscover it.
 */

export interface GitOutput {
  status: number | null;
  stdout: string;
  stderr: string;
}

/**
 * Deadline for a single child process the fixture spawns (#111).
 *
 * The suites are spawn-bound, not compute-bound: one test costs six to twelve `git`
 * processes, and the hook cases boot a whole ESLint. A single step never legitimately
 * runs long — the slowest measured step on this host under 8-way CPU contention was
 * ~15 s — so this is a hang guard, not a budget. It exists because `spawnSync` blocks
 * the worker thread, which means Vitest's own timeout cannot interrupt a stuck child:
 * without this deadline a hung `git` would hang the gate instead of failing it.
 */
export const FIXTURE_STEP_TIMEOUT_MS = 120_000;

/**
 * Whole-test budget for anything that drives the fixture (#111). Pass it as the last
 * argument to the suite's `it`, never re-declare it per test.
 *
 * These tests are correct and their assertions are cheap; the *environment* is what is
 * slow. Measured on this host (8 logical CPUs, Git for Windows 2.56.1):
 *
 * | case                                  | idle   | 8-way CPU contention |
 * |---------------------------------------|--------|----------------------|
 * | heaviest `git`-only fixture test      | 1.3 s  | 17.9 s   (13x)       |
 * | real-ESLint hook test                 | 9.8 s  | 150 s    (15x)       |
 * | heaviest real-ESLint hook test        | 6.6 s  | 188 s    (29x)       |
 *
 * Vitest's 5 s default is below even the idle cost of the ESLint cases, and the two
 * opposite ends of 60 s both fell over under contention. 300 s is 1.6x the worst measured
 * case and 30x the worst idle one: wide enough to survive several concurrent agents on
 * one machine, narrow enough that a genuine hang is still reported inside a gate run.
 */
export const FIXTURE_TEST_BUDGET_MS = 300_000;

export interface StepOptions {
  cwd: string;
  input?: string;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
}

/**
 * `spawnSync`, but a step that overruns its own deadline says which step it was (#111).
 *
 * A test-level `TestTimeoutError` names a line number and, because the body is
 * synchronous, is only reported once the body returns — the failure that made this ticket
 * looked like a mystery 5 s test instead of a stalled `git commit`. Only a deadline
 * overrun is ours to explain: ENOENT is a host fact (`findPosixShell` probes for it), so
 * it keeps its old silent-status shape.
 */
export function runStep(command: string, args: string[], options: StepOptions): GitOutput {
  const timeoutMs = options.timeoutMs ?? FIXTURE_STEP_TIMEOUT_MS;
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    env: options.env ?? gitEnv(),
    input: options.input,
    encoding: "utf8",
    timeout: timeoutMs,
  });
  if (result.error !== undefined && (result.error as NodeJS.ErrnoException).code === "ETIMEDOUT") {
    throw new Error(
      `git-fixture: step \`${[command, ...args].join(" ")}\` timed out after ${timeoutMs} ms in ${options.cwd}`,
    );
  }
  return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

/**
 * A git environment with the repo-discovery variables removed.
 *
 * `git push` exports `GIT_DIR` to its hooks, and this test is reachable from the pre-push
 * hook (`npm run verify` → unit). Inheriting `GIT_DIR` made every `git` call below operate on
 * the *real* repository instead of the fixture: `git init` was ignored, `git add .` staged the
 * fixture file, and `git commit -qm one` rewrote the caller's HEAD — wiping the working tree
 * from the index. Observed twice on 2026-11-22 (commits `03cb58d` and `530aabd` "one", 181
 * files deleted, author `test <test@example.com>`). The fixture must be hermetic.
 */
export function gitEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  for (const key of ["GIT_DIR", "GIT_WORK_TREE", "GIT_INDEX_FILE", "GIT_OBJECT_DIRECTORY", "GIT_COMMON_DIR"]) {
    delete env[key];
  }
  return env;
}

/**
 * One directory, two spellings (#69). `mkdtempSync` returns whatever TMPDIR holds — on
 * this host the 8.3 short name `C:\Users\HLLENM~1\AppData\Local\Temp\...` — while
 * `git rev-parse --show-toplevel` answers with the long name and forward slashes, and
 * `realpathSync` (non-native) keeps the 8.3 form. Resolve both sides through the OS and
 * fold case on win32 only. A different directory still compares unequal, so the
 * hermeticity guard keeps its teeth.
 */
export function samePath(a: string, b: string): boolean {
  const left = realpathSync.native(a);
  const right = realpathSync.native(b);
  return process.platform === "win32" ? left.toLowerCase() === right.toLowerCase() : left === right;
}

/**
 * The suites drive POSIX `sh` scripts. Git for Windows keeps `sh.exe` in its own `bin`
 * directory, on PATH inside a hook but not in a PowerShell or cmd session, so a bare
 * `spawnSync("sh")` is ENOENT there. Probe PATH, then the install root that
 * `git --exec-path` points into.
 */
export function findPosixShell(): string | null {
  for (const candidate of ["sh", "bash"]) {
    const probe = runStep(candidate, ["-c", "exit 0"], { cwd: process.cwd() });
    if (probe.status === 0) return candidate;
  }
  if (process.platform !== "win32") return null;
  const execPath = runStep("git", ["--exec-path"], { cwd: process.cwd() }).stdout.trim();
  if (execPath === "") return null;
  // <git>/mingw64/libexec/git-core → <git>, where bin/sh.exe and usr/bin/sh.exe live.
  const root = resolve(execPath, "..", "..", "..");
  for (const relative of ["bin/sh.exe", "usr/bin/sh.exe"]) {
    const shell = resolve(root, relative);
    if (existsSync(shell)) return shell;
  }
  return null;
}

/** `spawnSync("git", …)` in `dir`, with the hermetic environment and text output. */
export function runGit(dir: string, args: string[]): GitOutput {
  return runStep("git", args, { cwd: dir, env: gitEnv() });
}

/**
 * One named fixture step, so a stall reports `makeRepo step "commit"` rather than a bare
 * timeout (#111). Steps are named for the repo action, not the argv: `git add .` in a
 * fixture nobody can see names nothing.
 */
function step<T>(label: string, action: () => T): T {
  try {
    return action();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`git-fixture: makeRepo step "${label}" failed: ${message}`, { cause: error });
  }
}

/**
 * A fresh repository in the temp directory, hermetic by construction.
 *
 * `README` is written so the caller may stage files without an empty tree; the caller owns
 * cleanup of `dir`.
 */
export function makeRepo(prefix: string): { dir: string; git: (...args: string[]) => GitOutput } {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  const git = (...args: string[]) => runGit(dir, args);
  step("init", () => git("init", "-q"));
  // Hermetic, or the whole point of the fixture is lost: it must never be the real repo.
  const toplevel = step("hermeticity guard", () => git("rev-parse", "--show-toplevel").stdout.trim());
  if (!samePath(toplevel, dir)) throw new Error(`fixture repo is not hermetic: ${toplevel} !== ${dir}`);
  step("config user.email", () => git("config", "user.email", "test@example.com"));
  step("config user.name", () => git("config", "user.name", "test"));
  writeFileSync(join(dir, "README"), "fixture\n");
  step("add", () => git("add", "."));
  step("commit", () => git("commit", "-qm", "one"));
  return { dir, git };
}
