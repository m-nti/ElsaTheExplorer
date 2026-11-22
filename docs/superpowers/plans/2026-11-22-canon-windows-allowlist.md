# Canon allowlist path normalisation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Closes:** #85
**Branch:** `fix/canon-windows-allowlist`
**Base commit:** `9cd9b85` (`origin/main`, after #78's Svelte scan merged)

**Goal:** make `applyAllowlist()` compare one normalised path shape on both sides, so a
recorded exemption applies on a Windows checkout exactly as it does on Linux.

**Architecture:** one helper turns any repo-relative path into the POSIX shape the corpus
and the allowlist are written in. It is applied to **both** operands of the comparison —
the scanned file's path and the entry's `file` key — and to the baseline-hit filter. No
rule, no baseline row and no allowlist entry changes.

**Tech Stack:** Node 26 ESM script (`scripts/canon-check.mjs`), Vitest 5 (`canon` project).

**Spec:** GitHub issue #85 (root-cause section), `scripts/canon-allowlist.json`,
`docs/superpowers/plans/2026-11-22-v2-delivery.md` §0.

## Global Constraints

- Canon is unchanged by this ticket: the rule set, the baseline rows and the allowlist
  entries are untouched, and no copy in the corpus is rewritten. The gate itself is the
  authority — `npm run canon` and the rules declared in `scripts/canon-check.mjs`.
- The allowlist must not be weakened: every entry still has to match exactly one line,
  and stale/ambiguous entries still fail the gate (exit 2).
- No canon content is edited by this ticket — no rewrite of a baselined row.
- Same exit codes on Windows and POSIX (`0` clean, `1` violations, `2` config error).
- No force-push, no history rewrite.

## Review Focus

- A key written with the host's separator must resolve on the other host too; the fixture
  ships one shape and the gate runs on both, so a Windows-only or POSIX-only assumption
  shows up as a red test rather than as a silently unused entry.
- `sources.has(resolve(root, file))` must still be reached through the normalised key, or
  a valid entry turns into a "file the scan never read" error (exit 2).
- Normalisation must not collapse two distinct entries onto one line: the single-line and
  ambiguity checks run before coverage, and a key still has to name exactly one row.
- The baseline path (`--strict`, `baselineHits`, the cap) reads `entry.file` directly; a
  key in the wrong shape must not paint a baseline defect green.
- A path that already is POSIX must be unchanged by the helper, so Linux behaviour and the
  reported `61 allowlisted line(s)` count stay identical.

---

### Task 1: Pin the mismatch with a cross-platform fixture (red)

**Files:**
- Create: `tests/canon/fixtures/backslash-allowlist/design/spec.md`
- Create: `tests/canon/fixtures/backslash-allowlist/scripts/canon-allowlist.json`
- Create: `tests/canon/fixtures/backslash-baseline/design/spec.md`
- Create: `tests/canon/fixtures/backslash-baseline/scripts/canon-allowlist.json`
- Modify: `tests/canon/canon.test.mjs` (the `allowlist discipline` block)

**Interfaces:**
- Consumes: the gate CLI contract — `node scripts/canon-check.mjs --root <dir> --json`,
  exit `0` clean / `1` violations / `2` configuration error.
- Produces: `fixture("backslash-allowlist")` and `fixture("backslash-baseline")` cases.

- [ ] **Step 1: Write the fixtures**

`backslash-allowlist/design/spec.md` carries one excused history row and nothing else;
its allowlist key is written with a backslash (`design\\spec.md` in JSON).
`backslash-baseline/design/spec.md` carries one baselined row; same key shape, entry
`status: "baseline"`, `issue: 85`, `maxBaseline: 1`.

- [ ] **Step 2: Write the failing tests**

```js
it("applies a backslash-keyed entry on either host", () => {
  const { code, report } = fixture("backslash-allowlist");
  expect(code).toBe(0);
  expect(report.status).toBe("clean");
  expect(report.allowlist.allowed).toBe(1);
});

it("counts a backslash-keyed baseline row instead of painting it green", () => {
  const { code, report } = fixture("backslash-baseline");
  expect(code).toBe(0);
  expect(report.allowlist.baseline).toBe(1);
  expect(report.allowlist.baselineHits).toBe(1);
});
```

- [ ] **Step 3: Run them and verify the failure**

Run: `npx vitest run --project canon -t "backslash-keyed"`
Expected: FAIL — exit code `1`, the exemption is reported as a live violation, and
`baselineHits` is `0`.

- [ ] **Step 4: Commit the red test**

```bash
git add tests/canon
git commit -m "test(canon): pin backslash-keyed allowlist entries (#85)"
```

### Task 2: Normalise both operands (green)

**Files:**
- Modify: `scripts/canon-check.mjs` — `toPosix()`, `applyAllowlist()`, `baselineHits`

**Interfaces:**
- Consumes: Task 1's fixtures.
- Produces: `toPosix(value: string): string`, unchanged signature, now separator-agnostic.

- [ ] **Step 1: Make the helper separator-agnostic**

`toPosix(value)` becomes `value.split(/[\\/]/).join("/")`: host output and a key written
on either host land on the same shape. A POSIX path is returned unchanged.

- [ ] **Step 2: Key the allowlist map by the normalised path**

In `applyAllowlist()`, group entries under `toPosix(entry.file)`, so the map key, the
`resolve(root, file)` lookup and the comparison against
`toPosix(relative(root, violation.file))` are all the same shape. Entry messages keep
naming the file.

- [ ] **Step 3: Normalise the baseline comparison**

In `main()`, `baselineHits` compares `toPosix(relative(...))` against `toPosix(entry.file)`.

- [ ] **Step 4: Run the canon suite and verify green**

Run: `npm run test:canon`
Expected: all tests pass, including the two new ones.

- [ ] **Step 5: Verify the real checkout and the ratchet**

Run: `npm run canon`, `npm run canon:strict`
Expected: exit `0` and the same `61 allowlisted line(s)` count as before the change; the
baseline count is unchanged.

- [ ] **Step 6: Prove the test guards the regression**

Temporarily revert Step 2's comparison to the raw `relative(root, violation.file)`, run
`npm run test:canon`, and confirm the backslash-keyed case fails; restore the fix and
confirm green again.

- [ ] **Step 7: Commit**

```bash
git add scripts/canon-check.mjs
git commit -m "fix(canon): normalise both allowlist operands so the gate runs on Windows (#85)"
```
