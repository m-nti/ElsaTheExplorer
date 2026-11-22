#!/usr/bin/env node
/**
 * plan-status — a plan may not call a merged PR "in review" (issue #61 §2).
 *
 * A plan is the argument a reviewer reads before the code. When it says "in
 * review" for a PR that merged three commits ago, the reader is told to wait for
 * something that already happened; when it says "merged" for a PR still open, the
 * reader is told a gate passed that has not run. Both are the same defect: the
 * plan and the tracker disagree, and nothing was checking.
 *
 * ## The contract
 *
 * For every `PR #<n>` mention in every plan, a **status token in the same clause
 * after the mention** (the clause ends at `|`, `.`, `;` or end of line) makes it a
 * claim:
 *
 * | token | claim |
 * | --- | --- |
 * | `in review`, `in-review`, `awaiting review`, `review pending`, `🟡`, `⬜`, `open` | review |
 * | `merged`, `landed`, `✅`, `done` | merged |
 *
 * A mention with no token in its clause is prose and is not a claim. That is what
 * keeps "PR #2 produced two moving review heads and a review of a stale commit"
 * — a true sentence in the delivery plan — out of the report. The word `review`
 * alone is deliberately not a token: it is the noun in that sentence.
 *
 * ## Why it degrades instead of failing
 *
 * The merged set comes from `gh pr list --state all`. CI runs with
 * `permissions: contents: read` and no token, so the call cannot succeed there;
 * a red gate in that environment would train everyone to ignore it. Without
 * `gh`, or without a network, the check prints
 * `plan-status: WARNING — could not read merged PRs (<reason>); the plan claims
 * are unverified` and exits 0. It never reports "clean" for a check it did not
 * run — that is the difference between a warning and a pass.
 *
 * Usage:
 *   node scripts/plan-status.mjs                        # docs/superpowers/plans, via gh
 *   node scripts/plan-status.mjs --root <dir>           # one directory (tests)
 *   node scripts/plan-status.mjs --prs <json>           # { "merged": [], "open": [] }
 *   node scripts/plan-status.mjs --gh <path>            # gh binary to use
 *   node scripts/plan-status.mjs --json                 # machine-readable report
 *
 * Exit codes: 0 = consistent (or unverified), 1 = a claim contradicts the log,
 *             2 = usage error (a plan root or a PR fixture that does not exist).
 */

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

const MENTION = /PR #(\d+)/g;
/** A claim ends where the sentence, cell or clause ends. */
const CLAUSE_END = /[|.;]/;
const REVIEW = /\bin[ -]review\b|\bawaiting review\b|\breview pending\b|🟡|⬜|\bopen\b/i;
const MERGED = /\bmerged\b|\blanded\b|✅|\bdone\b/i;

const argv = process.argv.slice(2);
const json = argv.includes("--json");
const flag = (name) => {
  const at = argv.indexOf(name);
  return at === -1 ? null : (argv[at + 1] ?? "");
};

const repoRoot = resolve(import.meta.dirname, "..");
const planRoot = flag("--root") === null ? resolve(repoRoot, "docs/superpowers/plans") : resolve(flag("--root"));
const prsFixture = flag("--prs");
const ghBinary = flag("--gh") ?? "gh";

const toLabel = (file) => relative(repoRoot, file).split(sep).join("/");

function isDirectory(path) {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

if (!isDirectory(planRoot)) {
  console.error(`plan-status: plan root does not exist: ${planRoot}`);
  process.exit(2);
}
if (prsFixture !== null && !existsSync(prsFixture)) {
  console.error(`plan-status: PR fixture does not exist: ${prsFixture}`);
  process.exit(2);
}

/**
 * number → "merged" | "open". `null` means the set could not be read, and comes
 * with the reason to print.
 */
function readPrStates() {
  if (prsFixture !== null) {
    try {
      const data = JSON.parse(readFileSync(prsFixture, "utf8"));
      const states = new Map();
      for (const number of data.merged ?? []) states.set(Number(number), "merged");
      for (const number of data.open ?? []) states.set(Number(number), "open");
      return { states, reason: "" };
    } catch (error) {
      return { states: null, reason: `unreadable fixture (${error.message})` };
    }
  }

  const call = spawnSync(
    ghBinary,
    ["pr", "list", "--state", "all", "--json", "number,state", "--limit", "1000"],
    { encoding: "utf8", timeout: 15_000, maxBuffer: 32 * 1024 * 1024 },
  );
  if (call.error) return { states: null, reason: `${ghBinary}: ${call.error.message}` };
  if (call.status !== 0) {
    const detail = (call.stderr ?? "").trim().split(/\r?\n/)[0] ?? `exit ${call.status}`;
    return { states: null, reason: `${ghBinary} exited ${call.status}: ${detail}` };
  }
  try {
    const rows = JSON.parse(call.stdout);
    const states = new Map();
    for (const row of rows) states.set(Number(row.number), String(row.state).toLowerCase() === "merged" ? "merged" : "open");
    return { states, reason: "" };
  } catch (error) {
    return { states: null, reason: `unparseable gh output (${error.message})` };
  }
}

const { states, reason } = readPrStates();
const violations = [];
let mentions = 0;

/** Every plan under `dir`, at any depth, sorted — a plan directory may nest. */
function planFiles(dir) {
  const found = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!entry.name.startsWith(".")) found.push(...planFiles(full));
    } else if (/\.mdx?$/i.test(entry.name)) {
      found.push(full);
    }
  }
  return found.sort();
}

for (const file of planFiles(planRoot)) {
  const lines = readFileSync(file, "utf8").split(/\r?\n/);

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    for (const mention of line.matchAll(MENTION)) {
      mentions += 1;
      if (states === null) continue;
      const after = line.slice(mention.index + mention[0].length);
      const clause = after.split(CLAUSE_END)[0];
      const claim = REVIEW.test(clause) ? "review" : MERGED.test(clause) ? "merged" : null;
      if (claim === null) continue;

      const pr = Number(mention[1]);
      const actual = states.get(pr);
      if (actual === undefined) continue;
      if (claim === "review" && actual === "merged") {
        violations.push({ file: toLabel(file), line: index + 1, pr, claim, actual });
      } else if (claim === "merged" && actual === "open") {
        violations.push({ file: toLabel(file), line: index + 1, pr, claim, actual });
      }
    }
  }
}

const messages = violations.map(
  (violation) =>
    `${violation.file}:${violation.line}: PR #${violation.pr} is ${violation.actual} but the plan says ` +
    `"${violation.claim === "review" ? "in review" : "merged"}"`,
);

if (states === null) {
  if (json) {
    console.log(JSON.stringify({ status: "skipped", reason, prs: 0, mentions, violations: [] }));
  }
  console.error(`plan-status: WARNING — could not read merged PRs (${reason}); the plan claims are unverified`);
  process.exit(0);
}

if (json) {
  console.log(
    JSON.stringify({
      status: violations.length === 0 ? "clean" : "mismatch",
      reason,
      prs: states.size,
      mentions,
      violations,
    }),
  );
  process.exit(violations.length === 0 ? 0 : 1);
}

for (const message of messages) console.error(message);
if (violations.length > 0) {
  console.error(
    `\nplan-status: ${violations.length} claim(s) contradict the merged log — ` +
      "correct the row; a plan that is wrong about the tracker is wrong about the work.",
  );
  process.exit(1);
}
console.log(`plan-status: clean (${mentions} PR mention(s) in ${states.size} tracked PRs)`);
