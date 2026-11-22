# D5c — Canon baseline burn-down Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Empty the canon gate's documented baseline — every live-copy string that still names the collection by its retired name is rewritten to the copy-deck canon (Die Sammlung / The Collection), so `npm run canon:strict` exits 0 with `maxBaseline: 0`.

**Architecture:** Docs-only. Seven baseline rows in five documents are text substitutions to values the copy deck already owns (§0.3, §1, §6.3, §9); the copy deck's §15 history row keeps its *old* column (history) and takes the canon value in its *new* column. The allowlist drops every `status: "baseline"` entry, keeps one history entry, and `maxBaseline` goes to 0. No copy key is renamed and no product code is touched. One enabling tooling fix is folded in because the ticket's own proof command cannot run on Windows without it (T1).

**Tech Stack:** Node 26, `scripts/canon-check.mjs`, `scripts/canon-allowlist.json`, Vitest (`--project canon`), Markdown design specs.

**Spec:** `docs/decisions.md` D-04b · `design/copy/copy-deck.md` §0.3/§1/§6.3/§9/§15 · issue #31 · `docs/superpowers/plans/2026-11-22-v2-delivery.md` §0.

**Closes:** #31 · **Branch:** `docs/d5c-canon-burn-down` · **Base:** `6b9c50a`

## Global Constraints

- Canon: entity **Die Sammlung / The Collection**; verb **gesammelt / collected**; no water vocabulary; no binder-family synonym for the collection (retired with no exception, copy deck §13); at most one `!`; Der Abfahrtsaal.
- The archival concept survives only where it names the archive's own instrument (number, register, certificate, entry), a code identifier, a copy key, or a history row — never as the collection's name in live copy.
- Copy keys are unchanged: `catalogue.*`, `catalogue:milestone-reached`, `#catalogue-line` stay exactly as they are.
- `design/copy/copy-deck.md` §13 and §14 rows are unchanged: they must keep the retired forms visible.
- DE/EN parity: every quoted pair is edited in both languages, and the German carries correct gender agreement with *die Sammlung* (`eine Sammlung`, `in der Sammlung`).
- Docs tasks use the gate as their proof instead of TDD (§0.6 stage 6): `npm run canon` and `npm run canon:strict` are the red→green cycle. T1 is the exception — it is code in `scripts/`, so it uses the existing failing test.
- No product code (`src/**`), no dependency, no copy-key change, no unrelated redesign.

## Review Focus

- **German gender agreement** — *die Sammlung* is feminine; a mechanical swap of the retired noun produces `ein Sammlung` / `im Sammlung`, which is a new defect, not a rename. Both pairs in T2 are checked for this.
- **Byte-for-byte match with the copy deck** — `reset.body` and `catalogue.milestone` exist in the deck; the spec quotes must match the deck's value character for character (em dash included), or the propagation pass leaves two versions of one string.
- **History is not erased** — `design/copy/copy-deck.md` §15's *Old* column records what the voice ruling replaced; rewriting it would falsify the record. It keeps the retired form and is allowlisted as history. §13/§14 stay untouched.
- **Allowlist staleness is fatal** — the gate exits 2 on an entry that no longer matches. Every entry whose text changes in this PR must be removed in the same commit: the §15 baseline entry is re-classed to `allowed`, and the `player-journey.md:560` entry must disappear once that string is renamed.
- **The strict gate must be run, not reasoned about** — `npm run canon:strict` on the final tree, output pasted in the PR (verification-before-completion).

## Inventory — skills and crew

Loaded together for this ticket (all govern, none optional):

| Skill | Governs |
|---|---|
| `localize` | DE/EN parity, placeholder and length discipline on every rewired pair |
| `consistency-check` | cross-document consistency: one canonical value per string, copy deck as SSOT |
| `content-audit` | the baseline table is an inventory: specified rows vs actually fixed rows |
| `writing-plans` | this plan, the task shape, gate-as-proof substitution for TDD |
| `verification-before-completion` | the strict/`canon`/`verify` runs are the only completion evidence |

Crew: studio owner **writer** (this run) — copy authority per §0.5 "Narrative & copy". Cross-check reviewer: **localization-lead** (owner of the string register). Considered and not staffed: `ux-designer`/`narrative-director` (no journey or myth *design* changes, only naming), `art-director` (no art rows in scope), `cs-architecture-reviewer` (no ADR or contract change) — the docs-only diff still gets the consistency review AGENTS.md requires, carried by `consistency-check` plus the localization-lead cross-check.

## Ruling recorded (not escalated)

`design/ux/stage-landing.md`'s UI-anatomy names for the `#catalogue-line` element (label / line / track) are **not** renamed by this ticket. They name a DOM element whose id is an identifier (canon-legal under D-04b and the gate's own inline exemption); renaming the prose without renaming the id would create doc↔code drift, and a renamed id is a product change this ticket forbids. Cost if wrong: one follow-up rename ticket across spec + `src/`; the baseline count is unaffected either way.

---

### Task 1: Make the canon gate's allowlist path handling platform-independent

**Files:**
- Modify: `scripts/canon-check.mjs` — `applyAllowlist`, the `baselineHits` filter, `describe`, and the JSON report's `scanned`/`violations[].file`
- Test: `tests/canon/canon.test.mjs` (existing; no new test needed — the failures are the red)

**Interfaces:**
- Consumes: nothing.
- Produces: `toPosix(value)` helper local to the script. Allowlist `file` values (always forward-slash, repo-relative) are compared against a POSIX-normalised `relative()` result, and every reported path uses the same shape. No export, no behaviour change on POSIX hosts.

- [ ] **Step 1: Prove the gate is red on this host for the right reason**

Run: `npm run test:canon`
Expected: 5 failures — `passes the real repo`, `flags every forbidden family`, `resets the masking state`, `excuses exactly one reasoned line`, `warns but passes by default`. Each is a path comparison: `relative()` returns host separators on Windows (`design\copy\copy-deck.md`) while the allowlist says `design/copy/copy-deck.md`; `npm run canon` reports 128 violations in 17 files instead of the 7 known baseline defects.

- [ ] **Step 2: Normalise the comparison**

Add beside the other helpers:

```js
/** Allowlist `file` values are repo-relative POSIX paths; `relative()` is host-shaped. */
function toPosix(value) {
  return value.split(sep).join("/");
}
```

Use it in the four places named in **Files** that turn a path into a repo-relative string compared with, or printed as, an allowlist-shaped path.

- [ ] **Step 3: Verify green**

Run: `npm run test:canon` → 29/29 pass. Then `npm run canon` → clean, `7 known defect(s) in the baseline` (the pre-burn-down count this ticket exists to remove).

- [ ] **Step 4: Commit**

```bash
git add scripts/canon-check.mjs
git commit -m "fix(canon): normalise allowlist paths so the gate runs on Windows (#31)"
```

---

### Task 2: Rename the live-copy rows quoted by the specs

**Files:**
- Modify: `design/features/mechanics.md:109`
- Modify: `design/narrative/greek-origin.md:23`
- Modify: `design/ux/binder.md:272`, `design/ux/binder.md:279`
- Modify: `design/ux/interaction-patterns.md:515`, `design/ux/interaction-patterns.md:668`

**Interfaces:**
- Consumes: the copy-deck values for `catalogue.milestone` (§6.3) and `reset.body` (§9) — the spec quotes must equal them byte for byte.
- Produces: four files whose live-copy quotes name the collection; the `--strict` baseline hits drop to one (`copy-deck.md:667`).

- [ ] **Step 1: Watch the gate fail on exactly these rows**

Run: `npm run canon -- --strict`
Expected: fails with 7 baseline defects at the six lines above plus `design/copy/copy-deck.md:667`.

- [ ] **Step 2: Apply the six substitutions**

| File:line | Change |
|---|---|
| `mechanics.md:109` | EN import line: the retired name → `no longer in the collection.`; DE partner `im Sammlung` → `in der Sammlung` (agreement fix) |
| `greek-origin.md:23` | EN lede: the retired name → `one collection.`; DE partner `ein Sammlung` → `eine Sammlung` (agreement fix) |
| `binder.md:272` | milestone announcement EN → `Collection: {pct} per cent done — {outfit}.` |
| `binder.md:279` | `reset.body` EN → `This clears the Collection, room progress, …` (deck §9 verbatim) |
| `interaction-patterns.md:515` | `reset.body` EN → same deck §9 value |
| `interaction-patterns.md:668` | milestone announcement EN → same deck §6.3 value |

Nothing else on those lines changes; no key name, cap, or note is touched. The DE `reset.body` and DE milestone halves already read `Sammlung` and do not move.

- [ ] **Step 3: Re-run the gate**

Run: `npm run canon -- --strict`
Expected: one remaining baseline defect (`copy-deck.md:667`). The six fixed lines are still covered by their now-stale entries; they are removed in Task 4.

- [ ] **Step 4: Commit**

```bash
git add design/features/mechanics.md design/narrative/greek-origin.md design/ux/binder.md design/ux/interaction-patterns.md
git commit -m "docs(d5c): rename the collection in the quoted spec copy (#31)"
```

---

### Task 3: Copy deck §15 and the player-journey surface names

**Files:**
- Modify: `design/copy/copy-deck.md:667`
- Modify: `design/player-journey.md:273`, `:462`, `:537`, `:544`, `:547`, `:548`, `:560`, `:650`, `:665`

**Interfaces:**
- Consumes: the deck's own §1 `meta.description` value (`… die Sammlung füllen.`) as the authority for the §15 *New* column.
- Produces: `player-journey.md` surface names `Reading the Collection` / `Completing the Collection`; the session-start question at `:560` reads `What's new in the Collection?` (its allowlist entry becomes stale and must go in Task 4).

- [ ] **Step 1: §15 new column takes the canon value**

`den Katalog füllen` → `die Sammlung füllen`. The *Old* column keeps the retired German phrase it already carries — that column is the record of what the voice ruling replaced (see Task 4's history entry). The EN halves are unchanged.

- [ ] **Step 2: Session-start question**

`player-journey.md:560`: the quoted question's collection noun → `Collection`.

- [ ] **Step 3: Surface names**

`Reading the Catalogue` → `Reading the Collection`; `Completing the Catalogue` → `Completing the Collection` — the two phase headings, the four phase-table rows, and the two summary headings. The German partners (`In der Sammlung blättern`, `Das Gesamtverzeichnis`) already match the canon and do not move.

- [ ] **Step 4: Commit**

```bash
git add design/copy/copy-deck.md design/player-journey.md
git commit -m "docs(d5c): copy deck §15 and journey surface names follow the canon (#31)"
```

---

### Task 4: Empty the baseline and prove the ratchet

**Files:**
- Modify: `scripts/canon-allowlist.json`

**Interfaces:**
- Consumes: the renames from Tasks 2–3 (every baseline line and the `player-journey.md` entry must already be gone, or this task creates a stale entry and exit 2).
- Produces: `maxBaseline: 0`, zero `status: "baseline"` entries, one new `status: "allowed"` history entry for `design/copy/copy-deck.md`.

- [ ] **Step 1: Remove the seven baseline entries and the stale journey entry**

Deleted, by `file` + `issue: 31`: `copy-deck.md`, `mechanics.md`, `greek-origin.md`, `binder.md` ×2, `interaction-patterns.md` ×2; plus the `player-journey.md` entry whose string no longer exists after Task 3.

- [ ] **Step 2: Add the one history entry**

```json
{
  "file": "design/copy/copy-deck.md",
  "match": "<the exact retired German phrase already in the §15 row — copy it from the baseline entry being removed>",
  "status": "allowed",
  "reason": "History row: §15 records the superseded pre-voice value of `meta.description`; the live value in §1 is canon."
}
```

- [ ] **Step 3: Lower the cap**

`"maxBaseline": 7` → `"maxBaseline": 0`.

- [ ] **Step 4: Prove the ratchet, both modes**

Run: `npm run canon` → `canon-check: clean (… files, … lines, 8 rules) · N allowlisted line(s)` with **no** baseline clause, exit 0.
Run: `npm run canon:strict` → the same clean line, exit 0.
Run: `npm run test:canon` → 29/29.
Run: `grep -c 'catalogue\.' design/copy/copy-deck.md` → unchanged count (keys intact).

- [ ] **Step 5: Run the project gate set and record where it stops**

Run: `npm run verify`. Expected: `canon`, `canon-self-test`, `table-integrity` green; record the exact residual if a later gate stops (other tickets' debt is reported, not hidden).

- [ ] **Step 6: Commit, push, PR**

```bash
git add scripts/canon-allowlist.json
git commit -m "docs(d5c): baseline emptied, maxBaseline 0 (#31)"
git push -u origin docs/d5c-canon-burn-down
gh pr create --repo m-nti/ElsaTheExplorer --base main --head docs/d5c-canon-burn-down \
  --title "docs(d5c): burn down the canon baseline (#31)" --body-file <pr-body>
```

PR body carries: `Closes #31`, the before/after gate output, the seven-row table old → new, the §15 history ruling, the stage-landing ruling, the merge gate, and the localization-lead cross-check request. No merge in this session.

---

## Self-review

- **Spec coverage:** #31 AC 1 (table rows) → T2, T3; AC 2 (`canon:strict` 0) → T4.4; AC 3 (`canon` 0 baseline) → T4.4; AC 4 (no key rename) → Global Constraints + T4.4; AC 5 (§12/§13/§14 untouched) → Global Constraints + T3 (only §15 edited). Evidence/DoD → T4.4–T4.6.
- **Step scan:** every step names one file set and one command with the expected result; no "handle edge cases".
- **Type consistency:** `toPosix` is defined once and used only in the four report/comparison sites named.
- **Review Focus:** DE gender (T2.2), byte-for-byte (T2.1/Interfaces), history preserved (T3.1/T4.2), staleness (T4.1), proof run (T4.4).
- **Proportion:** four tasks, one gate command each; no code beyond the 4-line `toPosix`.
