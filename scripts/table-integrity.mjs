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
 * A table also ends at the first line that is not a table row. Prose inserted
 * between the header and its body therefore turns every following row into
 * plain text with no error anywhere — the defect D4 found in
 * `design/ux/card-detail.md` §12 (issue #75). So a row-looking line that is not
 * itself the start of a table, in a section that has already shown one, is
 * reported as an orphan instead of being skipped.
 *
 * There is no allowlist and no ignore list on purpose: an exemption is how a
 * table gate dies. Fix the row instead.
 *
 * Usage:
 *   node scripts/table-integrity.mjs                 # gate docs/ and design/
 *   node scripts/table-integrity.mjs --root <dir>    # gate one root (tests)
 *   node scripts/table-integrity.mjs --json          # machine-readable report
 *
 * Exit codes: 0 = every table rectangular, 1 = at least one misaligned or
 *             orphaned row, 2 = usage error (a root that does not exist).
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

const DEFAULT_ROOTS = ["docs", "design"];
const MARKDOWN = /\.mdx?$/i;
const FENCE = /^\s*(```|~~~)/;
const DELIMITER = /^\s*\|(?:\s*:?-+:?\s*\|)+\s*$/;
const HEADING = /^\s{0,3}#{1,6}(?:\s|$)/;
const INDENTED_CODE = /^(?:\t| {4})/;


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
 * is not a table row; fenced and four-space-indented code blocks are skipped, so
 * a Markdown example is not mistaken for the document's own table. A row-looking
 * line outside any table, in a section that already showed one, is an orphan:
 * prose ended the table, so its cells render as plain text.
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
  let sectionHasTable = false;

  for (let i = 0; i < lines.length; i++) {
    if (FENCE.test(lines[i])) {
      fenced = !fenced;
      continue;
    }
    if (fenced) continue;
    if (INDENTED_CODE.test(lines[i])) continue;
    if (HEADING.test(lines[i])) {
      sectionHasTable = false;
      continue;
    }
    if (!lines[i].trimStart().startsWith("|")) continue;
    if (i + 1 >= lines.length || !DELIMITER.test(lines[i + 1])) {
      if (sectionHasTable) {
        violations.push({
          file: label,
          line: i + 1,
          kind: "orphan",
          row: lines[i].trim(),
        });
      }
      continue;
    }

    tables += 1;
    sectionHasTable = true;
    const header = fields(lines[i]);
    let row = i + 2;
    for (; row < lines.length && !INDENTED_CODE.test(lines[row]) && lines[row].trimStart().startsWith("|"); row++) {
      const actual = fields(lines[row]).length;
      if (actual !== header.length) {
        violations.push({
          file: label,
          line: row + 1,
          kind: "misaligned",
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
  if (violation.kind === "orphan") {
    console.error(
      `${violation.file}:${violation.line}: orphaned table row — prose ends the table above, so these cells render as plain text; ` +
        "restore the row to the table or start a new header and delimiter\n" +
        `  ${violation.row}`,
    );
    continue;
  }
  console.error(
    `${violation.file}:${violation.line}: expected ${violation.expected} field(s), found ${violation.actual}\n  ${violation.row}`,
  );
}
if (violations.length > 0) {
  console.error(
    `\ntable-integrity: ${violations.length} table defect(s) in ${tables} table(s) — ` +
      "a row must match its header and must not be separated from it by prose; never drop content.",
  );
  process.exit(1);
}
console.log(`table-integrity: clean (${tables} tables, ${files.length} files)`);
