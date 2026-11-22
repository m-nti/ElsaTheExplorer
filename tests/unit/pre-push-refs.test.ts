import { spawnSync } from "node:child_process";
import { mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const script = fileURLToPath(new URL("../../scripts/pre-push-refs.sh", import.meta.url));
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

function repo() {
  const dir = mkdtempSync(join(tmpdir(), "prepush-"));
  dirs.push(dir);
  const git = (...args: string[]) => spawnSync("git", args, { cwd: dir, env: gitEnv(), encoding: "utf8" });
  git("init", "-q");
  // Hermetic, or the whole point of the fixture is lost: it must never be the real repo.
  // `realpathSync` because macOS `tmpdir()` is `/var/...` while git reports `/private/var/...`.
  const toplevel = git("rev-parse", "--show-toplevel").stdout.trim();
  if (toplevel !== realpathSync(dir)) throw new Error(`fixture repo is not hermetic: ${toplevel} !== ${realpathSync(dir)}`);
  git("config", "user.email", "test@example.com");
  git("config", "user.name", "test");
  writeFileSync(join(dir, "a.txt"), "a");
  git("add", ".");
  git("commit", "-qm", "one");
  return { dir, git, head: git("rev-parse", "HEAD").stdout.trim() };
}

function run(dir: string, head: string, stdin: string) {
  return spawnSync("sh", [script, head], { cwd: dir, env: gitEnv(), input: stdin, encoding: "utf8" });
}

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("pre-push ref check", () => {
  it("accepts a push of HEAD", () => {
    const { dir, head } = repo();
    const result = run(dir, head, `refs/heads/main ${head} refs/heads/main ${zero}\n`);
    expect(result.status).toBe(0);
  });

  it("refuses a ref that is not HEAD", () => {
    const { dir, git, head } = repo();
    const other = git("commit-tree", "-p", head, "-m", "two", "HEAD^{tree}").stdout.trim();
    const result = run(dir, head, `refs/heads/other ${other} refs/heads/other ${zero}\n`);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("only HEAD");
  });

  it("accepts an annotated tag that peels to HEAD", () => {
    const { dir, git, head } = repo();
    git("tag", "-a", "v1", "-m", "v1");
    const tag = git("rev-parse", "v1").stdout.trim();
    expect(tag).not.toBe(head);
    const result = run(dir, head, `refs/tags/v1 ${tag} refs/tags/v1 ${zero}\n`);
    expect(result.status).toBe(0);
  });

  it("accepts a lightweight tag", () => {
    const { dir, git, head } = repo();
    git("tag", "v1");
    const result = run(dir, head, `refs/tags/v1 ${head} refs/tags/v1 ${zero}\n`);
    expect(result.status).toBe(0);
  });

  it("ignores a deletion", () => {
    const { dir, head } = repo();
    const result = run(dir, head, `(delete) ${zero} refs/heads/gone ${head}\n`);
    expect(result.status).toBe(0);
  });
});
