#!/usr/bin/env node
/**
 * Gate manifest check — CI fails closed.
 *
 * Every gate CI claims to run is declared in `.github/gates.json`. A gate is
 * only "enforced" when (a) its npm script exists and (b) `ci.yml` actually runs
 * `npm run <script>`. Gates that cannot exist yet are declared "pending" with
 * the open issue that will land them; a pending gate never masquerades as a
 * pass.
 *
 * Why: run 45015462546 reported "Canon / vocabulary gate → success" on a
 * commit whose package.json had no `canon` script at all — `--if-present`
 * turned a deleted gate into a green step. This check is the ratchet.
 *
 * Usage: node scripts/ci-gates.mjs [root]
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.argv[2] ?? ".");
const read = (path) => readFileSync(resolve(root, path), "utf8");

const errors = [];
const manifest = JSON.parse(read(".github/gates.json"));
const pkg = JSON.parse(read("package.json"));
// Comments legitimately *name* the banned patterns; only executable lines count.
const workflow = read(".github/workflows/ci.yml")
  .split("\n")
  .filter((line) => !line.trimStart().startsWith("#"))
  .join("\n");

const scripts = new Set(Object.keys(pkg.scripts ?? {}));
const enforced = manifest.enforced ?? [];
const pending = manifest.pending ?? [];
const ids = new Set();

if (enforced.length === 0) errors.push("no enforced gates declared");

for (const gate of enforced) {
  if (!gate.id || !gate.script) {
    errors.push(`malformed enforced gate: ${JSON.stringify(gate)}`);
    continue;
  }
  if (ids.has(gate.id)) errors.push(`duplicate gate id: ${gate.id}`);
  ids.add(gate.id);

  if (!scripts.has(gate.script)) {
    errors.push(`enforced gate "${gate.id}": package.json has no script "${gate.script}"`);
  }
  // The step must be a `run:` line whose whole command is the gate: a step named
  // "npm run canon" that runs `echo skipped` is not evidence, and neither is
  // `npm run canon 2>&1 | tee log` (the pipe's status would hide the failure).
  const step = new RegExp(`^\\s*(?:-\\s*)?run:\\s*npm run ${gate.script.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "m");
  if (!step.test(workflow)) {
    errors.push(`enforced gate "${gate.id}": ci.yml has no bare "run: npm run ${gate.script}" step`);
  }
}

for (const gate of pending) {
  if (!gate.id) errors.push(`malformed pending gate: ${JSON.stringify(gate)}`);
  else if (ids.has(gate.id)) errors.push(`gate "${gate.id}" is both enforced and pending`);
  if (!Number.isInteger(gate.issue)) {
    errors.push(`pending gate "${gate.id}" must name an open issue`);
  }
}

for (const [pattern, why] of [
  [/--if-present/, "ci.yml uses --if-present: a missing script would report success"],
  [/\|\|\s*(?:true|:)(?:\s|$)/m, "ci.yml uses `|| true`/`|| :`: a failure would report success"],
  [/\|\|\s*exit\s+0\b/, "ci.yml uses `|| exit 0`: a failure would report success"],
  [
    /^\s*["']?continue-on-error["']?:\s*(?:true|\$\{\{\s*true\s*\}\})\s*(?:#.*)?$/im,
    "ci.yml sets continue-on-error: a failing gate would report success",
  ],
  [
    /^\s*["']?if["']?:\s*(?:false|\$\{\{\s*false\s*\}\})\s*(?:#.*)?$/im,
    "ci.yml gates a step on `if: false`: a gate that never runs would report success",
  ],
  [
    /npm run [A-Za-z0-9:_-]+[^\n]*\|/,
    "ci.yml pipes a gate through another command: the pipe's status hides the failure",
  ],
]) {
  if (pattern.test(workflow)) errors.push(why);
}

if (errors.length > 0) {
  for (const error of errors) console.error(`ci-gates: ${error}`);
  process.exit(1);
}

const pendingList = pending.map((gate) => `${gate.id} (#${gate.issue})`).join(", ");
console.log(
  `ci-gates: ${enforced.length} enforced (${enforced.map((gate) => gate.id).join(", ")})` +
    (pendingList ? ` · pending: ${pendingList}` : ""),
);
