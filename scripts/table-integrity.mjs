#!/usr/bin/env node
/**
 * table-integrity — every GFM table in `docs/` and `design/` must be rectangular.
 *
 * A row whose field count differs from its header row is not a cosmetic defect:
 * GFM renders the surplus cell as a phantom column, or absorbs it into the last
 * column, so the table silently shifts under the reader. `docs/test-plan.md`
 * shipped eleven such rows through four review passes (issue #29, lesson L-003:
 * a rule without a gate erodes), so the rule is enforced here instead of being
 * stated in a style note.
 *
 * The contract is the header row. Fields are split on **unescaped** `|`, which
 * is exactly GFM's rule: a pipe inside a code span still delimits a cell — it
 * must be written `\|`. That is why `E-ORG-01`'s regex needed escaping rather
 * than quoting.
 *
 * There is no allowlist and no ignore list on purpose: an exemption is how a
 * table gate dies. Fix the row instead.
 *
 * Usage:
 *   node scripts/table-integrity.mjs                 # gate docs/ and design/
 *   node scripts/table-integrity.mjs --root <dir>    # gate one root (tests)
 *   node scripts/table-integrity.mjs --json          # machine-readable report
 *
 * Exit codes: 0 = every table rectangular, 1 = at least one misaligned row,
 *             2 = usage error (a root that does not exist).
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

const DEFAULT_ROOTS = ["docs", "design"];
const MARKDOWN = /\.mdx?$/i;
const FENCE = /^\s*(```|~~~)/;
const DELIMITER = /^\s*\|(?:\s*:?-+:?\s*\|)+\s*$/;

/** Directories that hold build output, dependencies or archived sources. */
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", "styled-system", "reports"]);

/**
 * Split a table row into fields the way GFM does: on pipes that are not
 * backslash-escaped, with the outer pipes dropped.
 *
 * @param {string} line
 * @returns {string[]}
 */
function fields(line) {
  const parts = line.trim().split(/(?<!\\)\|/);
  if (parts.length > 0 && parts[0].trim() === "") parts.shift();
  if (parts.length > 0 && parts[parts.length - 1].trim() === "") parts.pop();
  return parts;
}

/**
 * @param {string} root absolute directory to walk
 * @returns {string[]} absolute paths of Markdown files
 */
function markdownFiles(root) {
  const found = [];
  const pending = [root];
  while (pending.length > 0) {
    const dir = pending.pop();
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) pending.push(join(dir, entry.name));
      } else if (MARKDOWN.test(entry.name)) {
        found.push(join(dir, entry.name));
      }
    }
  }
  return found.sort();
}

/**
 * Audit one file. Table = header row, delimiter row, then rows until a line that
 * is not a table row; fenced code blocks are skipped, so a Markdown example
 * inside a fence is not mistaken for the document's own table.
 *
 * @param {string} file absolute path
 * @param {string} root for a repo-relative label
 * @returns {{ tables: number, violations: object[] }}
 */
function audit(file, root) {
  const label = relative(root, file).split(sep).join("/");
  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  const violations = [];
  let tables = 0;
  let fenced = false;

  for (let i = 0; i < lines.length; i++) {
    if (FENCE.test(lines[i])) {
      fenced = !fenced;
      continue;
    }
    if (fenced) continue;
    if (!lines[i].trimStart().startsWith("|")) continue;
    if (i + 1 >= lines.length || !DELIMITER.test(lines[i + 1])) continue;

    tables += 1;
    const header = fields(lines[i]);
    let row = i + 2;
    for (; row < lines.length && lines[row].trimStart().startsWith("|"); row++) {
      const actual = fields(lines[row]).length;
      if (actual !== header.length) {
        violations.push({
          file: label,
          line: row + 1,
          table: `${label}:${i + 1}`,
          expected: header.length,
          actual,
          row: lines[row].trim(),
        });
      }
    }
    i = row - 1;
  }

  return { tables, violations };
}

const argv = process.argv.slice(2);
const json = argv.includes("--json");
const rootFlag = argv.indexOf("--root");
const repoRoot = resolve(import.meta.dirname, "..");
const roots =
  rootFlag === -1
    ? DEFAULT_ROOTS.map((dir) => resolve(repoRoot, dir))
    : [resolve(argv[rootFlag + 1] ?? "")];

for (const root of roots) {
  if (!existsSync(root)) {
    console.error(`table-integrity: root does not exist: ${root}`);
    process.exit(2);
  }
}

const files = roots.flatMap(markdownFiles);
const violations = [];
let tables = 0;
for (const file of files) {
  const report = audit(file, repoRoot);
  tables += report.tables;
  violations.push(...report.violations);
}

if (json) {
  console.log(
    JSON.stringify({
      status: violations.length === 0 ? "clean" : "violations",
      files: files.length,
      tables,
      violations,
    }),
  );
  process.exit(violations.length === 0 ? 0 : 1);
}

for (const violation of violations) {
  console.error(
    `${violation.file}:${violation.line}: expected ${violation.expected} field(s), found ${violation.actual}\n  ${violation.row}`,
  );
}
if (violations.length > 0) {
  console.error(
    `\ntable-integrity: ${violations.length} misaligned row(s) in ${tables} tables — ` +
      "add or remove a `|` so the row matches its header; never drop content.",
  );
  process.exit(1);
}
console.log(`table-integrity: clean (${tables} tables, ${files.length} files)`);
