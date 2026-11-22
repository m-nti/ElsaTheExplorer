#!/usr/bin/env node
/**
 * Local mirror of CI. Runs the enforced gates from `.github/gates.json` in the
 * same order CI runs them, stopping at the first failure.
 *
 * Why: CI used to be the first place the whole chain ran, so a script that
 * referenced an uncommitted file, or a deleted script, was discovered after the
 * push. This script is what the pre-push hook runs; CI runs the same scripts as
 * separate steps (for attribution), and `scripts/ci-gates.mjs` proves the two
 * lists agree.
 *
 * Usage: npm run verify
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const gates = JSON.parse(readFileSync(".github/gates.json", "utf8")).enforced ?? [];
if (gates.length === 0) {
  console.error("verify: no enforced gates — run `npm run ci:gates`");
  process.exit(1);
}

const failed = [];
const started = Date.now();

for (const gate of gates) {
  const at = Date.now();
  // Windows resolves `npm` to `npm.cmd`, which `spawnSync` cannot execute
  // without a shell (EINVAL since Node's CVE-2024-27980 fix). Without this the
  // local mirror failed at the FIRST gate on the owner's host while CI stayed
  // green — the gate disagreed with itself between hosts.
  const result = spawnSync("npm", ["run", gate.script], {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    failed.push(`${gate.id} (npm run ${gate.script})`);
    console.error(`\nverify: FAILED ${gate.id} — stopping.\n`);
    break;
  }
  console.log(`verify: ok ${gate.id} (${Date.now() - at} ms)`);
}

const seconds = ((Date.now() - started) / 1000).toFixed(1);
if (failed.length > 0) {
  console.error(`verify: ${failed.length} gate failed after ${seconds}s — run it alone for the full log.`);
  process.exit(1);
}
console.log(`\nverify: ${gates.length} gates green in ${seconds}s.`);
