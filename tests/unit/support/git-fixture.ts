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
    if (spawnSync(candidate, ["-c", "exit 0"], { encoding: "utf8" }).status === 0) return candidate;
  }
  if (process.platform !== "win32") return null;
  const execPath = spawnSync("git", ["--exec-path"], { encoding: "utf8" }).stdout?.trim();
  if (execPath === undefined || execPath === "") return null;
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
  const result = spawnSync("git", args, { cwd: dir, env: gitEnv(), encoding: "utf8" });
  return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
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
  git("init", "-q");
  // Hermetic, or the whole point of the fixture is lost: it must never be the real repo.
  const toplevel = git("rev-parse", "--show-toplevel").stdout.trim();
  if (!samePath(toplevel, dir)) throw new Error(`fixture repo is not hermetic: ${toplevel} !== ${dir}`);
  git("config", "user.email", "test@example.com");
  git("config", "user.name", "test");
  writeFileSync(join(dir, "README"), "fixture\n");
  git("add", ".");
  git("commit", "-qm", "one");
  return { dir, git };
}
