#!/usr/bin/env node
/**
 * check-paths — every internal link, and every backticked path that names a file
 * the repository holds elsewhere, must resolve (issue #61).
 *
 * Why this gate exists: moving `docs/action-plan.md` left three README links
 * pointing at a deleted file. `canon` reads the words and `ci-gates` reads the
 * workflow, so nothing in the chain could see a path that no longer exists — the
 * reader found it instead.
 *
 * ## What is checked
 *
 * 1. **Links** — `[text](target)`, `![alt](target)` and inline `<a href>` /
 *    `<img src>`. A link is navigation: if the target is not there, the reader
 *    cannot get there. A fragment (`#section`) is stripped, not resolved —
 *    heading anchors are not part of this contract.
 * 2. **Backticked paths** — a span rooted at `docs/`, `design/`, `src/`,
 *    `scripts/`, `tests/`, `public/`, `photos/`, `assets/` or `.github/`, whose
 *    target resolves **exactly**, or whose file name this repository holds
 *    under a different path — that is the moved-file reference the gate exists
 *    for, and it fails with `file:line`.
 *
 * ## What is deliberately not a claim
 *
 * A plan names the files it will create; an ADR records a module design; a
 * migration note quotes where v1 kept something. None of those is a statement
 * that a path resolves today, and this repository is mid-refactor, so the
 * documents contain a hundred and forty-nine such references. The rule that
 * separates them needs no allowlist: a backticked path is a claim **when the
 * repository already holds a file or directory of that name somewhere else**.
 * `docs/action-plan.md` is a claim because `docs/archive/action-plan.md` exists;
 * `src/lib/pwa/cachePolicy.ts` is not, because nothing anywhere is called
 * `cachePolicy.ts`. The gate therefore fails on the move, and does not fail on
 * the plan.
 *
 * The cost of that rule, stated so it is not discovered later: a reference to a
 * directory whose contents left the tree **whole** is not a claim either. A
 * wholesale directory move is caught by the link family, not this one.
 *
 * Also not a path, and never reported: a template or glob span
 * (`docs/plans/YYYY-MM-DD-<slug>.md`, `src/**\/*.css`, `tests/unit/[system]/`,
 * `docs/adr/ADR-0001…0011`), an outbound target (a URI scheme, `//`, or a
 * leading `/`), anything inside a fenced block (an example of a form, not a
 * link), and anything under `legacy/` or `fixtures/`, which are archived and
 * deliberately-broken corpora (`SKIP_DIRS`).
 *
 * Case is compared **exactly**, segment by segment, on every platform. Windows
 * resolves `docs/EXISTS.md` against `docs/exists.md`; `ubuntu-latest` does not.
 * A gate that passes here and fails in CI teaches nothing, so the comparison
 * goes through `readdirSync` instead of `existsSync`.
 *
 * Usage:
 *   node scripts/check-paths.mjs                    # tracked Markdown, whole repo
 *   node scripts/check-paths.mjs --root <dir>       # one directory (tests)
 *   node scripts/check-paths.mjs --json             # machine-readable report
 *
 * Exit codes: 0 = every claim resolves, 1 = at least one stale claim,
 *             2 = usage error (a root that does not exist).
 */

import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join, relative, resolve, sep } from "node:path";

const MARKDOWN = /\.mdx?$/i;
const LINK = /!?\[[^\]]*\]\(\s*(<[^>]*>|[^)\s]+)(?:\s+["'][^"']*["'])?\s*\)/g;
const HTML_ATTR = /\b(?:href|src)\s*=\s*"([^"]+)"/gi;
const BACKTICK = /`([^`\n]+)`/g;
const SCHEME = /^[a-z][a-z0-9+.-]*:/i;
/** `:12`, `:12-18`, `:210,440` — a line or line-set suffix, not part of a path. */
const LINE_SUFFIX = /:\d+(?:[-,–]\d+)*$/;
/** A span carrying any of these is a template, a glob or a range, not a path. */
const NOT_LITERAL = /[*?{}[\]<>…|$\u2026]/;

/** Repository roots a backticked path may name. */
const PATH_PREFIXES = new Set([
  "docs",
  "design",
  "src",
  "scripts",
  "tests",
  "public",
  "photos",
  "assets",
  ".github",
]);

/**
 * Directory names never scanned for references: build output, dependencies, and
 * two corpora that are not current-state prose — `legacy/` (the frozen v1 tree)
 * and `fixtures/` (deliberately broken). This is not an allowlist — no file
 * inside a scanned directory is exempt.
 *
 * `legacy/` is still **indexed** (see `heldByName`): a file that moved there is
 * exactly what a reference to its old path gets wrong, and v1's move to
 * `legacy/` is the largest such move in this repository.
 */
const SKIP_DIRS = new Set([
  ".git",
  ".svelte-check",
  ".vite",
  "build",
  "coverage",
  "dist",
  "fixtures",
  "legacy",
  "node_modules",
  "playwright-report",
  "qa-shots",
  "reports",
  "styled-system",
  "test-results",
]);

/** Never part of the "does the repository hold a file of this name" index. */
const UNSCOPED_DIRS = new Set(["fixtures", "node_modules", ".git"]);

const argv = process.argv.slice(2);
const json = argv.includes("--json");
const rootFlag = argv.indexOf("--root");
const repoRoot = resolve(import.meta.dirname, "..");
const scanRoot = rootFlag === -1 ? repoRoot : resolve(argv[rootFlag + 1] ?? "");

function existsDirectory(path) {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

if (rootFlag !== -1 && !existsDirectory(scanRoot)) {
  console.error(`check-paths: root does not exist: ${scanRoot}`);
  process.exit(2);
}

const toLabel = (file) => relative(repoRoot, file).split(sep).join("/");

/**
 * True when a directory segment of a repository-relative path is in `dirs`.
 * The last segment is the entry itself, so a tracked `legacy/module.md` counts as
 * being inside `legacy/`.
 */
function scopedSegment(relativePath, dirs = SKIP_DIRS) {
  const segments = relativePath.split(/[\\/]/);
  const directories = segments.length > 1 ? segments.slice(0, -1) : segments;
  return directories.some((segment) => dirs.has(segment));
}

/** The tracked set, or null when git is unavailable. */
function gitTracked() {
  const result = spawnSync("git", ["ls-files", "-z"], {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error || result.status !== 0) return null;
  return result.stdout.split("\0").filter((path) => path !== "");
}

const tracked = gitTracked();
const wholeRepo = scanRoot === repoRoot && tracked !== null;

/**
 * Every file the repository holds, by name: a lowercased basename mapped to each
 * path carrying it. This is the index that decides whether a backticked path is a
 * claim about this tree (see the header). Directories are not indexed: a
 * reference to `assets/` is a shape of the tree, not a file the reader can open.
 */
const heldByName = new Map();

function remember(path) {
  const name = basename(path).toLowerCase();
  if (!heldByName.has(name)) heldByName.set(name, new Set());
  heldByName.get(name).add(path);
}

if (wholeRepo) {
  for (const path of tracked) {
    if (!scopedSegment(path, UNSCOPED_DIRS)) remember(path);
  }
} else {
  const pending = [scanRoot];
  while (pending.length > 0) {
    const dir = pending.pop();
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (SKIP_DIRS.has(entry.name)) continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) pending.push(full);
      else remember(full);
    }
  }
}

/** Markdown files to scan, sorted. */
function markdownFiles() {
  if (wholeRepo) {
    return tracked
      .filter((path) => path !== "" && MARKDOWN.test(path) && !scopedSegment(path, SKIP_DIRS))
      .map((path) => resolve(repoRoot, path))
      .sort();
  }
  const found = [];
  const pending = [scanRoot];
  while (pending.length > 0) {
    const dir = pending.pop();
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) pending.push(full);
      } else if (MARKDOWN.test(entry.name)) {
        found.push(full);
      }
    }
  }
  return found.sort();
}

/**
 * Resolve `target` under `base` with an exact, case-sensitive comparison of
 * every segment, so a case-only difference is dead here exactly as on Linux.
 */
function resolvesExactly(base, target) {
  let current = base;
  for (const segment of target.split("/")) {
    if (segment === "" || segment === ".") continue;
    if (segment === "..") {
      current = dirname(current);
      continue;
    }
    let entries;
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      return false;
    }
    const match = entries.find((entry) => entry.name === segment);
    if (!match) return false;
    current = join(current, match.name);
  }
  try {
    return statSync(current).isFile() || statSync(current).isDirectory();
  } catch {
    return false;
  }
}

/** Strip a fragment, a query and a line suffix; decode an escape. */
function normalise(target) {
  let cleaned = target.trim();
  if (cleaned.startsWith("<") && cleaned.endsWith(">")) cleaned = cleaned.slice(1, -1).trim();
  cleaned = cleaned.split("#")[0].split("?")[0].replace(LINE_SUFFIX, "").trim();
  if (cleaned === "" || cleaned === "." || cleaned === "./") return "";
  try {
    return decodeURI(cleaned);
  } catch {
    return cleaned;
  }
}

/** A link target, or null when it is outbound, an anchor or not literal. */
function linkTarget(raw) {
  const value = raw.trim();
  if (value === "" || value.startsWith("#") || value.startsWith("/")) return null;
  if (SCHEME.test(value) || NOT_LITERAL.test(value.replace(/^<|>$/g, ""))) return null;
  return normalise(value);
}

/** A backticked repository path, or null when the span is prose or a template. */
function backtickTarget(span) {
  const value = span.trim();
  if (NOT_LITERAL.test(value)) return null;
  if (!PATH_PREFIXES.has(value.split("/")[0])) return null;
  return normalise(value);
}

const files = markdownFiles();
const violations = [];
let claims = 0;
let notYet = 0;

for (const file of files) {
  const base = dirname(file);
  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  /** The opening fence marker, or "" outside a fence. A fence closes only on the
   *  same character at the same length or longer, so a ```` block may show a ```
   *  example — which is exactly how the plans quote a failing form. */
  let fence = "";

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const marker = line.match(/^\s*(`{3,}|~{3,})/);
    if (marker) {
      if (fence === "") fence = marker[1];
      else if (marker[1][0] === fence[0] && marker[1].length >= fence.length) fence = "";
      continue;
    }
    if (fence !== "") continue;

    const found = [];
    for (const match of line.matchAll(LINK)) {
      const target = linkTarget(match[1]);
      if (target) found.push({ target, kind: "link", against: base });
    }
    for (const match of line.matchAll(HTML_ATTR)) {
      const target = linkTarget(match[1]);
      if (target) found.push({ target, kind: "link", against: base });
    }
    for (const match of line.matchAll(BACKTICK)) {
      const target = backtickTarget(match[1]);
      if (target) found.push({ target, kind: "path", against: scanRoot });
    }

    for (const candidate of found) {
      if (resolvesExactly(candidate.against, candidate.target)) {
        claims += 1;
        continue;
      }
      // A link is navigation and must resolve. A backticked path is a claim only
      // when the same name lives somewhere else in the repository.
      const held = heldByName.get(basename(candidate.target).toLowerCase());
      if (candidate.kind === "path" && !held) {
        notYet += 1;
        continue;
      }
      claims += 1;
      violations.push({
        file: toLabel(file),
        line: index + 1,
        target: candidate.target,
        kind: candidate.kind,
        elsewhere: held ? [...held].map(toLabel).sort().slice(0, 3).join(", ") : "",
      });
    }
  }
}

violations.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);

if (json) {
  console.log(
    JSON.stringify({
      status: violations.length === 0 ? "clean" : "violations",
      files: files.length,
      claims,
      notYet,
      violations,
    }),
  );
  process.exit(violations.length === 0 ? 0 : 1);
}

for (const violation of violations) {
  const hint = violation.elsewhere ? ` (the file is at ${violation.elsewhere})` : "";
  console.error(`${violation.file}:${violation.line}: ${violation.kind} ${violation.target} does not exist${hint}`);
}
if (violations.length > 0) {
  console.error(
    `\ncheck-paths: ${violations.length} stale reference(s) in ${files.length} files — ` +
      "fix the link or the backtick; a path that resolves only on the author's machine is the same defect.",
  );
  process.exit(1);
}
console.log(
  `check-paths: clean (${claims} claims in ${files.length} files, ${notYet} reference(s) to paths not built yet)`,
);
