# Named CI steps for the two transitively-enforced gates — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Closes:** #105 (named steps for `bible-tokens-parity` and `font-budget`), #99 (the
`font-budget` step). **Branch:** `ci/named-steps` · **Base:** `origin/main` (`2a04a2a`).

**Goal:** Every gate `.github/gates.json` declares is a named step that `ci:gates` enforces, so a
gate can be neither deleted nor left unnamed — 16 enforced on this branch's base, **18** on the merged tree after #98's two scanners.

**Architecture:** No new machinery. `scripts/ci-gates.mjs` already fails when an enforced gate has
no `npm run <script>` in `package.json` or no bare `run: npm run <script>` step in `ci.yml`; the two
gates were simply missing from the manifest, and one of the two scripts (`gate:parity`) was missing
from `package.json`. This change supplies the three declarations and pins them with a test, so the
entries themselves cannot be dropped silently.

**Tech Stack:** GitHub Actions YAML, npm scripts, Vitest 5.1.1 (unit project), the repository's own
`scripts/ci-gates.mjs`.

**Spec:** #105 · #99 · `scripts/ci-gates.mjs` (bare-step rule) · `.github/gates.json` ·
`docs/test-plan.md` §8.3 · `docs/superpowers/plans/2026-11-22-v2-delivery.md` §0.6.

## Global Constraints

- Bare steps only: no `--if-present`, no `|| true`, no `continue-on-error`, no pipe. `ci-gates`
  already rejects all four; do not weaken it.
- The existing transitive enforcement stays: `canon-self-test` (`test:canon`) keeps running the
  parity test and `unit` (`test:unit`) keeps running the font-budget wrapper. The named step is an
  addition, never a replacement.
- No other gate is removed, renamed or reordered. `pending` stays `e2e` (#24), `axe` (#24),
  `budget` (#25), `pwa` (#19).
- No rule change in `scripts/bible-tokens-parity.mjs` or `scripts/font-budget.mjs`.
- Canon: no water content, no retired binder nouns, at most one `!` per surface, the sixth room is
  Der Abfahrtsaal. This change touches no player-facing copy.
- No force-push, no history rewrite, no deploy, no merge in this workstream.

## Review Focus

- **A declared gate with no step must be red.** The manifest is the ratchet; the test in
  `tests/unit/ci-gates.test.ts` pins the two ids so deleting the *entry* (which `ci:gates` alone
  would accept) is also a red build.
- **`gate:parity` must exist in `package.json`, not only in the manifest.** `ci-gates` checks the
  script name and the step independently; a manifest entry with a missing script fails twice.
- **The named step must run the same command the transitive path runs.** `gate:fonts` is
  `node scripts/font-budget.mjs`; the Vitest wrapper spawns the same file. Two paths, one rule.
- **Doc counts are claims.** README, `docs/test-plan.md` §8.3, ADR-0011 and v2-delivery §0.6 all
  stated a gate count; a stale count is a false claim about what CI runs.
- **Windows host vs CI parity.** `verify` is green on this host in ~112 s; the pre-push hook runs
  the same list, so a Windows-only red would be visible before the push, not after it.

---

### Task 1: Pin the two gates in the manifest test

**Files:**
- Modify: `tests/unit/ci-gates.test.ts`
- Test: `tests/unit/ci-gates.test.ts`

**Interfaces:**
- Consumes: `scripts/ci-gates.mjs [root]` → stdout `ci-gates: <N> enforced (<ids>)`, exit 0/1.
- Produces: `describe("this repository's manifest")` — two cases that read the real
  `.github/gates.json` and run `ci-gates` against the repo root.

- [x] **Step 1: Write the failing test** — assert `arrayContaining` both
      `{ id: "bible-tokens-parity", script: "gate:parity" }` and
      `{ id: "font-budget", script: "gate:fonts" }`, then run `ci-gates` on the real tree and
      assert exit 0 with both ids in stdout.

- [x] **Step 2: Run it — expected RED** —
      `npx vitest run tests/unit/ci-gates.test.ts --project unit` →
      `Tests 2 failed | 13 passed`, `to contain 'bible-tokens-parity'`, received
      `ci-gates: 14 enforced (gate-manifest, canon, … build) · pending: …`.

### Task 2: Declare both gates in `.github/gates.json`

**Files:**
- Modify: `.github/gates.json`

- [x] **Step 1: Add the two entries** — `bible-tokens-parity` (`gate:parity`) after
      `table-integrity`; `font-budget` (`gate:fonts`) after `build`, matching `ci.yml` order so
      `verify` runs them where CI does.

- [x] **Step 2: Run `npm run ci:gates` — expected RED, twice, and this is the point** —
      ```
      ci-gates: enforced gate "bible-tokens-parity": package.json has no script "gate:parity"
      ci-gates: enforced gate "bible-tokens-parity": ci.yml has no bare "run: npm run gate:parity" step
      ci-gates: enforced gate "font-budget": ci.yml has no bare "run: npm run gate:fonts" step
      ```
      exit 1 — a declared gate cannot report success before its script and step exist.

### Task 3: Supply the script and the two named steps

**Files:**
- Modify: `package.json`
- Modify: `.github/workflows/ci.yml`

- [x] **Step 1: `package.json`** — `"gate:parity": "node scripts/bible-tokens-parity.mjs"`, beside
      `gate:tables`. `gate:fonts` already exists (#35).

- [x] **Step 2: `ci.yml`** — `name: Art bible <-> token parity` · `run: npm run gate:parity` after
      `Markdown table integrity`; `name: Font byte budget` · `run: npm run gate:fonts` after
      `Build`.

- [x] **Step 3: Run `npm run ci:gates` — expected GREEN** —
      `ci-gates: 18 enforced (gate-manifest, canon, canon-self-test, table-integrity,
bible-tokens-parity, internal-paths, plan-status, typecheck, svelte-check, stylelint,
selector-diff, unused-css, eslint, knip, jscpd, unit, build, font-budget)`
      bible-tokens-parity, typecheck, svelte-check, stylelint, selector-diff, unused-css, eslint,
      knip, jscpd, unit, build, font-budget) · pending: e2e (#24), axe (#24), budget (#25),
      pwa (#19)`.

- [x] **Step 4: Run the two gates alone** — `gate:parity`:
      `bible-tokens-parity: clean (33 declarations, 26 required tokens agree with tokens.ts)`;
      `gate:fonts`: `2 font(s) within the 30,000 B ceiling`.

### Task 4: Prove fail-closed on a seeded step deletion

**Files:** `.github/workflows/ci.yml` (seeded, then restored byte-for-byte from a backup copy).

- [x] **Step 1: Delete both new step blocks and run `ci-gates`** — exit 1:
      ```
      ci-gates: enforced gate "bible-tokens-parity": ci.yml has no bare "run: npm run gate:parity" step
      ci-gates: enforced gate "font-budget": ci.yml has no bare "run: npm run gate:fonts" step
      ```
- [x] **Step 2: Restore and re-run** — `ci-gates: 16 enforced (…)`, exit 0.

### Task 5: Make the documented counts true

**Files:**
- Modify: `README.md` (Gates)
- Modify: `docs/test-plan.md` (§8.3, §10 checklist)
- Modify: `docs/superpowers/plans/2026-11-22-v2-delivery.md` (§0.6)
- Modify: `docs/adr/ADR-0011-card-budgets.md` (gate paragraph + font row)
- Modify: `docs/build/i5b-verification.md` (§4)

- [x] **Step 1: Replace every gate-count claim with 16 and name both new gates.** README said
      "Twelve" and omitted `gate-manifest`/`table-integrity`; test-plan §8.3 and §10 said
      thirteen; v2-delivery §0.6 said 13; ADR-0011 said thirteen and "no enforced step measures
      bytes".
- [x] **Step 2: Stop describing either gate as enforced through `canon-self-test` / `test:unit`.**
      i5b §4 and ADR-0011's font row now name the step and the gate; the transitive tests are
      described as the second path they are, not the only one.
- [x] **Step 3: `npm run gate:tables` clean (369 tables, 62 files); `npm run canon` clean.**

### Task 6: Gate the tree

- [x] **Step 1: `npm run lint`** → 0 problems. **`npm run check:ts`** → 0. **`npm run check`** →
      `svelte-check found 0 errors and 0 warnings`.
- [x] **Step 2: `npm run verify`** → `verify: 16 gates green in 112.4s.` (every gate `verify: ok`,
      including `unit` 64.8 s and `font-budget` 0.5 s).
- [x] **Step 3: Commit, push, PR with `Closes #105` / `Closes #99`, request `cs-code-auditor`.**
