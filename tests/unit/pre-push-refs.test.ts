import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

/** MSYS `sh` takes a forward-slash path; a POSIX host sees no change. */
const script = fileURLToPath(new URL("../../scripts/pre-push-refs.sh", import.meta.url)).replaceAll("\\", "/");
const zero = "0".repeat(40);
const dirs: string[] = [];

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
function gitEnv(): NodeJS.ProcessEnv {
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
function samePath(a: string, b: string): boolean {
  const left = realpathSync.native(a);
  const right = realpathSync.native(b);
  return process.platform === "win32" ? left.toLowerCase() === right.toLowerCase() : left === right;
}

/**
 * The suite drives `scripts/pre-push-refs.sh`, which is POSIX sh. Git for Windows keeps
 * `sh.exe` in its own `bin` directory, on PATH inside a hook but not in a PowerShell or
 * cmd session, so a bare `spawnSync("sh")` is ENOENT there and all five tests fail for a
 * reason unrelated to the ref check. Probe PATH, then the install root that
 * `git --exec-path` points into.
 */
function findPosixShell(): string | null {
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

const shell = findPosixShell();
const shellReason = shell === null ? "no POSIX shell (sh or bash) on this host" : null;
if (shellReason !== null) console.warn(`[pre-push-refs] five hook tests skipped — ${shellReason}`);
/** Skip with a named reason instead of spawning a command that cannot exist here. */
const hookIt: typeof it =
  shell === null
    ? ((title: string, _fn: () => void) => it.skip(`${title} — skipped: ${shellReason}`, () => {})) as typeof it
    : it;

function repo() {
  const dir = mkdtempSync(join(tmpdir(), "prepush-"));
  dirs.push(dir);
  const git = (...args: string[]) => spawnSync("git", args, { cwd: dir, env: gitEnv(), encoding: "utf8" });
  git("init", "-q");
  // Hermetic, or the whole point of the fixture is lost: it must never be the real repo.
  const toplevel = git("rev-parse", "--show-toplevel").stdout.trim();
  if (!samePath(toplevel, dir)) throw new Error(`fixture repo is not hermetic: ${toplevel} !== ${dir}`);
  git("config", "user.email", "test@example.com");
  git("config", "user.name", "test");
  writeFileSync(join(dir, "a.txt"), "a");
  git("add", ".");
  git("commit", "-qm", "one");
  return { dir, git, head: git("rev-parse", "HEAD").stdout.trim() };
}

function run(dir: string, head: string, stdin: string) {
  if (shell === null) throw new Error(`no POSIX shell to run the hook script: ${shellReason}`);
  return spawnSync(shell, [script, head], { cwd: dir, env: gitEnv(), input: stdin, encoding: "utf8" });
}

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("pre-push ref check", () => {
  hookIt("accepts a push of HEAD", () => {
    const { dir, head } = repo();
    const result = run(dir, head, `refs/heads/main ${head} refs/heads/main ${zero}\n`);
    expect(result.status).toBe(0);
  });

  hookIt("refuses a ref that is not HEAD", () => {
    const { dir, git, head } = repo();
    const other = git("commit-tree", "-p", head, "-m", "two", "HEAD^{tree}").stdout.trim();
    const result = run(dir, head, `refs/heads/other ${other} refs/heads/other ${zero}\n`);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("only HEAD");
  });

  hookIt("accepts an annotated tag that peels to HEAD", () => {
    const { dir, git, head } = repo();
    git("tag", "-a", "v1", "-m", "v1");
    const tag = git("rev-parse", "v1").stdout.trim();
    expect(tag).not.toBe(head);
    const result = run(dir, head, `refs/tags/v1 ${tag} refs/tags/v1 ${zero}\n`);
    expect(result.status).toBe(0);
  });

  hookIt("accepts a lightweight tag", () => {
    const { dir, git, head } = repo();
    git("tag", "v1");
    const result = run(dir, head, `refs/tags/v1 ${head} refs/tags/v1 ${zero}\n`);
    expect(result.status).toBe(0);
  });

  hookIt("ignores a deletion", () => {
    const { dir, head } = repo();
    const result = run(dir, head, `(delete) ${zero} refs/heads/gone ${head}\n`);
    expect(result.status).toBe(0);
  });
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
  });

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
  });
});
