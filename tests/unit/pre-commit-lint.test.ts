import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { findPosixShell, gitEnv, makeRepo, runGit, type GitOutput } from "./support/git-fixture";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
/** MSYS `sh` takes a forward-slash path; a POSIX host sees no change. */
const hook = fileURLToPath(new URL("../../.githooks/pre-commit", import.meta.url)).replaceAll("\\", "/");
const installedNodeModules = fileURLToPath(new URL("../../node_modules", import.meta.url));
const installedConfig = fileURLToPath(new URL("../../eslint.config.js", import.meta.url)).replaceAll("\\", "/");
const dirs: string[] = [];

const shell = findPosixShell();
const shellReason = shell === null ? "no POSIX shell (sh or bash) on this host" : null;
if (shellReason !== null) console.warn(`[pre-commit-lint] six hook tests skipped — ${shellReason}`);
/** Skip with a named reason instead of spawning a command that cannot exist here. */
const hookIt: typeof it =
  shell === null
    ? ((title: string, _fn: () => void, _timeout?: number) =>
        it.skip(`${title} — skipped: ${shellReason}`, () => {})) as typeof it
    : it;

/**
 * A fixture repository that runs the repository's *real* ESLint config.
 *
 * The junction is what makes that honest: the hook resolves `node_modules/eslint/bin/eslint.js`
 * from the fixture root, and the config it imports resolves its plugins from the real
 * installation. Nothing is faked, so the seeded unused import is rejected by the rule that
 * runs in CI.
 */
function fixture(): { dir: string; git: (...args: string[]) => GitOutput } {
  const { dir, git } = makeRepo("precommit-");
  dirs.push(dir);
  writeFileSync(join(dir, "package.json"), '{"type":"module"}\n');
  writeFileSync(join(dir, "eslint.config.js"), `export { default } from ${JSON.stringify(pathToFileURL(installedConfig).href)};\n`);
  symlinkSync(installedNodeModules, join(dir, "node_modules"), "junction");
  return { dir, git };
}

/**
 * A fixture whose ESLint only records its argv and exits 0: what is under test is the hook's
 * file selection, not the linter.
 */
function recorder(): { dir: string; git: (...args: string[]) => GitOutput; passed: () => string[] } {
  const { dir, git } = makeRepo("precommit-");
  dirs.push(dir);
  const log = join(dir, "eslint-argv.log");
  writeFileSync(join(dir, "package.json"), '{"type":"module"}\n');
  write(dir, "node_modules/eslint/bin/eslint.js", [
    'import { appendFileSync } from "node:fs";',
    `appendFileSync(${JSON.stringify(log)}, process.argv.slice(2).join("\\n") + "\\n");`,
    "",
  ].join("\n"));
  const passed = () => (existsSync(log) ? readFileSync(log, "utf8").split("\n").filter(Boolean) : []);
  return { dir, git, passed };
}

function write(dir: string, relative: string, contents: string): void {
  const target = join(dir, relative);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, contents);
}

function runHook(dir: string) {
  if (shell === null) throw new Error(`no POSIX shell to run the hook: ${shellReason}`);
  return spawnSync(shell, [hook], { cwd: dir, env: gitEnv(), encoding: "utf8" });
}

/** The hook may spell a path `./src/a.ts`; compare the path it was given, not its prefix. */
function paths(passed: string[]): string[] {
  return passed.filter((argument) => !argument.startsWith("--")).map((path) => path.replace(/^\.\//, ""));
}

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("pre-commit lint hook (#103)", () => {
  hookIt("rejects a staged unused import and names the file and line", () => {
    const { dir, git } = fixture();
    write(dir, "src/seed.ts", 'import { readFileSync } from "node:fs";\n\nexport const answer = 42;\n');
    git("add", "src/seed.ts");

    const result = runHook(dir);
    const output = `${result.stdout}${result.stderr}`;

    expect(result.status).toBe(1);
    expect(output).toContain("seed.ts");
    // The formatter's own `1:10  error  …` line is the report the author needs.
    expect(output).toMatch(/1:\d+\s+error/);
    expect(output).toContain("@typescript-eslint/no-unused-vars");
    expect(output).toContain("commit blocked");
  }, 60_000);

  hookIt("commits a clean staged change", () => {
    const { dir, git } = fixture();
    write(dir, "src/clean.ts", "export const answer = 42;\n");
    git("add", "src/clean.ts");

    const result = runHook(dir);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("ESLint on 1 staged file");
  }, 60_000);

  hookIt("passes an empty lintable stage without starting ESLint", () => {
    const { dir, git, passed } = recorder();
    write(dir, "docs/notes.md", "A docs-only change stages no source file.\n");
    git("add", "docs/notes.md");

    const result = runHook(dir);

    expect(result.status).toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe("");
    expect(passed()).toEqual([]);
  });

  hookIt("ignores an unstaged file that holds an unused variable", () => {
    const { dir, git } = fixture();
    write(dir, "src/clean.ts", "export const answer = 42;\n");
    git("add", "src/clean.ts");
    write(dir, "src/unstaged.ts", 'import { readFileSync } from "node:fs";\n\nexport const other = 1;\n');

    const result = runHook(dir);

    expect(result.status).toBe(0);
    expect(`${result.stdout}${result.stderr}`).not.toContain("no-unused-vars");
  }, 60_000);

  hookIt("hands ESLint every staged source extension and nothing else", () => {
    const { dir, git, passed } = recorder();
    const staged = ["src/a.ts", "src/b.js", "src/c.mjs", "src/d.cjs", "src/e.svelte"];
    for (const relative of staged) {
      write(dir, relative, "export const answer = 42;\n");
      git("add", relative);
    }
    // A path with a space must arrive as one argument; a non-source file is not linted.
    write(dir, "src/mein hund.ts", "export const answer = 42;\n");
    write(dir, "docs/notes.md", "docs\n");
    write(dir, "src/style.css", ".a { color: red; }\n");
    git("add", "src/mein hund.ts", "docs/notes.md", "src/style.css");

    const result = runHook(dir);

    expect(result.status).toBe(0);
    expect(paths(passed()).sort()).toEqual([...staged, "src/mein hund.ts"].sort());
  });

  it("is committed executable, so a Linux checkout can run it", () => {
    const listing = runGit(repoRoot, ["ls-files", "-s", ".githooks/pre-commit"]).stdout.trim();
    expect(listing.split(/\s+/)[0]).toBe("100755");
  });
});
