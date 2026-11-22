# Canon self-test derives its template list Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The canon self-test asserts what the gate actually read — every Svelte template it scanned — instead of a literal list that turns `main` red whenever a component is added.

**Architecture:** `scripts/canon-check.mjs --json` already reports both surfaces: `scanned` (every file walked) and `templates` (the templates whose text was read, #49). The test derives the expected list from those two report fields, and cross-checks it against the `.svelte` files on disk under `src/` so the derivation cannot pass vacuously if the gate stops scanning `src/` altogether.

**Tech Stack:** Vitest 5 (`canon` project), Node 26, `node:child_process` / `node:fs`.

**Spec:** issue #90; `tests/canon/canon.test.mjs` (D12b block); `scripts/canon-check.mjs` (`templates` in the `--json` report).

**Closes #90** · **Branch:** `fix/ci-canon-self-test` · **Base:** `922c88f` (rebased over #96, whose literal template update this supersedes)

## Global Constraints

- Canon (AGENTS.md, 2026-11-22): Die Sammlung / The Collection, verb gesammelt / collected, four cards per pack, Der Abfahrtsaal, dry archive, at most one `!` and never in errors/announcements/aria.
- No new dependency; no production-code change — the gate's behaviour is correct, the expectation in the test is not.
- The assertion must not be weakened: full-list equality, no `includes`, no length-only assertion, no skip.
- One writer, one file: `tests/canon/canon.test.mjs` (plus this plan).

## Review Focus

- **A component is added to `src/`** — the suite must stay green by itself; both derived lists grow together.
- **The gate stops marking a template it read** — `templates` loses an entry while `scanned` keeps it; the equality must turn red (mutation evidence in the PR).
- **The gate stops scanning `src/`** — both reported lists shrink together, so the on-disk list under `src/` is the independent second opinion.
- **Windows path shape** — the report is POSIX by contract; the on-disk helper must normalise `\` to `/` or every comparison fails on the author's host.

---

### Task 1: Derive the template expectation from the report

**Files:**
- Modify: `tests/canon/canon.test.mjs:327-345`

**Interfaces:**
- Consumes: `run([])` → `{ code, report }`; `report.scanned: string[]`, `report.templates: string[]`.
- Produces: `svelteTemplatesOnDisk(): string[]` — sorted POSIX repo-relative paths of every `.svelte` file under `src/`.

- [ ] **Step 1: Replace the literal assertion**

```js
expect(report.templates).toEqual(
  report.scanned.filter((file) => file.endsWith(".svelte")).sort(),
);
```

- [ ] **Step 2: Add the on-disk cross-check**

Walk `src/` recursively with `readdirSync(..., { withFileTypes: true })`, keep `entry.name.endsWith(".svelte")`, map through `relative(repoRoot, full).split(sep).join("/")`, sort; assert equality with `report.templates` filtered to the `src/` prefix.

- [ ] **Step 3: Run the suite green**

Run: `npm run test:canon` — Expected: 38 passed.

- [ ] **Step 4: Demonstrate the mutation (RED)**

Comment out `if (isSvelteFile(file)) templates.add(toPosix(relativeFile));` in `scripts/canon-check.mjs`, run `npx vitest run --project canon -t "Svelte template"`, record the failure, restore the line, re-run green.

- [ ] **Step 5: Prove the neighbouring gates**

Run: `npm run canon` and `npm run gate:tables` — Expected: both exit 0.

- [ ] **Step 6: Commit**

```bash
git add tests/canon/canon.test.mjs docs/superpowers/plans/2026-11-22-ci-canon-selftest.md
git commit -m "test(canon): derive the template list from the gate report (#90)"
```
