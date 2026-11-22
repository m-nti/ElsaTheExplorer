# Action Plan — Elsa the Explorer

> Living document · rev 3 · 2026-11-22.
> Sources of truth: `AGENTS.md`, `design/`, `docs/architecture.md`, `docs/adr/`,
> `docs/decisions.md`, `design/copy/copy-deck.md`, `docs/test-plan.md`.
>
> **§0 is the binding delivery harness.** §§1–7 are the work it delivers. A task that
> skips a harness stage names the stage and the reason in its report — the harness is
> not advisory, and `AGENTS.md` remains the policy authority (who reviews, who merges,
> who owns the board). Superpowers is the method; the project rules are the law.

## Status legend

- ✅ done and committed (evidence linked)
- 🟡 in flight (agent running or partially applied)
- ⬜ ready — unblocked, starts now
- 🔴 blocked (the issue body names the blocker)

---

## 0 · Delivery harness — Superpowers

### 0.1 The loop

Process skills run **before** domain skills: `brainstorming` and
`systematic-debugging` decide *how* the work is done; `design-system`, `art-bible`,
`localize` and friends decide *what* is produced. Multiple skills are active at once
(L-001); one skill per task is a defect.

| # | Stage | Skill (Superpowers) | Output / exit gate |
|---|---|---|---|
| 1 | Frame | `brainstorming` | Goal, constraints, non-goals, open questions closed or ruled. No code before this. |
| 2 | Isolate | `using-git-worktrees` | Own worktree + branch per ticket (§0.2). Never implement on `main`. |
| 3 | Plan | `writing-plans` | `docs/superpowers/plans/YYYY-MM-DD-<slug>.md` with the mandatory header, Global Constraints, Review Focus, and bite-sized tasks carrying exact paths, signatures and the failing test (§0.3). |
| 4 | Staff | `dispatching-parallel-agents` | One implementer per independent task; crews per §0.5; never two writers on one file. |
| 5 | Execute | `subagent-driven-development` (default) · `executing-plans` (owner asks for inline) | Fresh implementer per task; task review after each; final whole-branch review; ledger written per §0.3. |
| 6 | Red → green | `test-driven-development` | The failing test exists before the implementation. Docs/design tasks substitute a gate (`canon`, `consistency-check`) or a named reviewer, recorded in the plan. |
| 7 | Debug | `systematic-debugging` | Failing gate → reproduce, isolate, root cause written down, then fix. No fix without a cause. |
| 8 | Review | `requesting-code-review` | `cs-code-auditor` on code/config; `cs-architecture-reviewer` on contracts/ADRs/cross-document consistency; domain reviewer per §0.5. Findings on the PR, blockers with `file:line`. |
| 9 | Receive | `receiving-code-review` | Every finding verified, not performed: FIXED / DEFERRED / NOT FIXED, each with evidence. Disagreement is argued with a citation, never silently dropped. |
| 10 | Prove | `verification-before-completion` | Pasted command output on the final tree. "Should pass" is not a result; a gate that cannot run here is named as unverified. |
| 11 | Land | `finishing-a-development-branch` | PR body states the merge gate; steward posts the resolution table; merge; board reconciled. |
| 12 | Learn | `writing-skills` · `diagnosing-superpowers` | A repeated failure becomes a gate, a lesson (L-00x) or a skill change — never a memo. |

### 0.2 Worktrees and branches

- One worktree per ticket: `../EhrenElsa-<slug>` (or `worktree_create`), branch
  `feat/<slug>` / `fix/<slug>` / `docs/<slug>`. `main` is never an implementation
  branch.
- The shared `design/explorer-foundation` tree is for documentation propagation only.
  Two writers in one tree is a defect: PR #2 produced two moving review heads and a
  review of a stale commit because of it.
- Force-push and history rewrite are stop conditions. Deleting owner data and an FTP
  deploy over `photos/` are stop conditions. Nothing else waits on a human.

### 0.3 Plans and the ledger

- **Committed plan**: `docs/superpowers/plans/YYYY-MM-DD-<slug>.md`. One plan per
  ticket cluster; the header carries `Closes #N`, branch, base commit, Global
  Constraints and Review Focus. A plan is the argument; the spec is the authority.
- **Per-plan workspace**: `.superpowers/sdd/<plan-slug>/` — `progress.md`, task briefs,
  implementer reports, review packages. The directory self-ignores via
  `.superpowers/sdd/.gitignore`, so it never enters `git status`. It is deleted after
  the final review passes; it is never shared between plans.
- **Ledger line**:
  `T3 ✅ 2026-11-22 · 1a2b3c4 · review approve (spec ✅ quality ✅) · Ruling: <what> — <why> — <cost if wrong>`
- The ledger is the resume point after compaction — conversation memory is not.

### 0.4 Rulings, stops, overrides

- SDD does not stall on ambiguity: decide, record the ruling in the ledger, continue.
  A wrong ruling costs visible rework; a parked session costs the whole day.
- Stops remain: irreversible/destructive operations, security-sensitive actions, side
  effects outside the worktree that norms say to ask about, and a plan whose every
  path is a guess.
- **Project override:** merge/push/deploy are *not* stalls here — the agent-owned PR
  lifecycle (§2, P4) makes the steward the named authority. Everything else in the stop
  list stands.
- A ruling that would change a ratified contract is not a ruling: it supersedes an ADR
  (ADR-0004 §5) or it stops.

### 0.5 Workstream → skills → crew

Default build crew: `ui-programmer` or `cs-frontend-engineer` implements,
`lead-programmer` or `cs-code-auditor` reviews, `cs-accessibility-engineer` signs the
a11y rows, `qa-tester` writes the failing test when the plan leaves it open.

| Workstream | Domain skills (in addition to §0.1's loop) | Crew |
|---|---|---|
| Design docs & UX specs | `ux-design`, `design-review`, `consistency-check`, `propagate-design-change`, `localize` | `ux-designer`, `writer`, `localization-lead` |
| Art, foil, visual identity | `art-bible`, `design-system`, `asset-spec` | `art-director`, `technical-artist` |
| Tokens & styling system | `design-system`, `architecture-review` | `ui-programmer`, `lead-programmer` |
| Card / pack / collection UI | `design-system`, `ux-review`, `test-setup`, `smoke-check` | `ui-programmer`, `gameplay-programmer`, `cs-accessibility-engineer` |
| Narrative & copy | `localize`, `consistency-check`, `content-audit` | `writer`, `narrative-director`, `localization-lead` |
| Image pipeline (PHP) | `security-audit`, `test-setup`, `perf-profile` | `cs-backend-engineer`, `security-engineer` |
| Tests & CI | `qa-plan`, `test-setup`, `test-flakiness`, `test-evidence-review` | `qa-lead`, `cs-qa-automation-lead` |
| Perf & a11y hardening | `perf-profile`, `smoke-check`, `soak-test` | `performance-analyst`, `accessibility-specialist` |
| Release & deploy | `release-checklist`, `launch-checklist`, `write-changelog` | `release-manager`, `devops-engineer` |

A design pass with only `ux-design` and no `consistency-check` is the L-001 defect, not
a shortcut.

### 0.6 "Done" at task level

1. The plan's test failed for the right reason before the code existed (or the doc gate
   was demonstrated failing).
2. The local gate set from `docs/test-plan.md` §8 passes for the task's scope:
   `canon` · typecheck (`tsc` + `svelte-check --tsgo`) · Stylelint + selector-diff +
   unused CSS · ESLint · knip · jscpd · Vitest · build · Playwright · axe · bundle/byte
   budget · PWA — eleven gates. Today `ci.yml` runs the scaffold subset and uses
   `--if-present`; **#25** closes that gap, and until it lands a missing script at merge
   time is called out in the PR instead of being assumed green.
3. A task review recorded **spec ✅ + quality ✅** (fix loop otherwise, cap per SDD).
4. Ledger appended; commit names the ticket; the PR body states the merge gate.

Branch-level done = final whole-branch review + §9 verification, then
`finishing-a-development-branch`.

---

## 1 · Documentation gates

| # | Task | Status | Evidence / issue |
|---|---|---|---|
| D1 | Reveal choreography: 4 cards, one in focus, camera pull-back, 2×2 mobile / row desktop, reduced-motion final frame | ✅ | `design/ux/pack-opening.md`, `interaction-patterns.md` (630a6f6) |
| D2 | Art bible §2/§7 aligned to the motion sheet + 4-card canon | ✅ | `design/art/art-bible.md` |
| D3 | `AD-ART-BIBLE` gate re-run and signed off | ✅ | header + matrix rows |
| D4 | `/ux-review all` re-run over the four specs | ⬜ | #4 |
| D5 | Canon vocabulary gate in CI | ✅ | `scripts/canon-check.mjs` + 11 self-tests (#5) |
| D5a | Misaligned tables in `test-plan.md` §5.3–§5.6 | ⬜ | #29 |
| D5c | Burn down the 7 canon baseline lines | ⬜ | #31 (ratchet: `npm run canon:strict`) |
| D6 | Copy deck §12 open items closed | ✅ | D-05; commit d9acbe8 |
| D7 | ADR-0003…0007 written and Accepted | ✅ | #6 closed with the ADR audit |
| D7a | ADR-0010 — accessibility runtime architecture | ⬜ | #32 |
| D7b | ADR-0011 — card frame and content budgets | ⬜ | #33 |
| D8 | `design/registry/entities.yaml` (rooms, sets, copy keys, storage keys, pack size) | ⬜ | #7 |
| D9 | Greek origin: epithet slot + capstone line | ✅ | D-03, D-04 |
| D10 | Sound bible sign-off; capstone voice line | ✅ | `design/audio/sound-bible.md` |
| D11 | README/PRD rewritten for the v2 stack and workflow | ⬜ | #8 |
| D3a | Bible ↔ tokens parity enforced by a script + CI | ⬜ | #30 (needs a script, hence a ticket — L-006) |

Harness for this section: `brainstorming` only where a design is open; otherwise
`consistency-check` + `design-review` with `ux-review`, and the canon gate as the
mechanical proof. Crew: `ux-designer` / `art-director` / `writer`; conductor runs
`consistency-check` itself.

## 2 · PR #2 — merge gate

| # | Task | Status |
|---|---|---|
| P1 | Code/security blockers B1–B5 | ✅ fixed & pushed (5339111) |
| P2 | Architecture blockers (12) — contract reconciliation | ✅ applied |
| P3 | Fresh review at the current head: `cs-code-auditor` + `cs-architecture-reviewer` | 🟡 architecture review posted (A1–A4, all fixed 2026-11-22); code re-review running |
| P4 | Resolution comment → merge to `main` (squash, admin bypass allowed) | ⬜ |
| P5 | Branch protection: required check `verify`, conversation resolution, squash-only, 0 approvals | ✅ |

Merge gate: both reviews on the current head + every finding in the resolution table +
`verify` green on that head + 0 unresolved threads. The steward posts the table, then
merges; the board moves #9 → Done, #10 → Done, and §3/B2 → Ready.

Harness: `requesting-code-review` → `receiving-code-review` → `verification-before-completion`
→ `finishing-a-development-branch`, with the project reviewers as the named crew.

## 3 · Build phases (Svelte 5 + Vite + Panda)

Every phase gets a committed plan before its first task. B0/B1 were delivered before the
harness and are recorded as such; B2 onward carry a plan and a ledger.

| # | Phase | Deliverable | Status | Plan / harness entry |
|---|---|---|---|---|
| B0 | Scaffold | `package.json`, `vite.config.ts`, TS 7 (+6 alias), `panda.config.ts`, `src/`, ESLint/Stylelint/knip/jscpd, CI `verify` | ✅ | pre-harness (`docs/build/b0-b1-verification.md`) |
| B1 | Tokens + gates | typed palette/type/spacing, rarity table + recipe, motion tokens, contrast gate that rejects the legacy `--quiet`, negative proofs | ✅ | pre-harness |
| B2 | CardFace | fixed %-height zones, 4:5 photo window, 5-layer foil, tilt, focus anchor, error state, 3-card + holo slice | ⬜ #13 | plan `2026-11-22-b2-cardface.md` (first task of the phase) · `ui-programmer` + `technical-artist` → `cs-code-auditor` |
| B3 | Entrance hall | static shell independent of the manifest, pack CTA, progress + Zuwachs lines, empty/error states | ⬜ #14 | plan per phase · `ui-programmer` → `ux-review` + `cs-accessibility-engineer` |
| B4 | Pack theatre | 4-card sequential focus + camera pull-back, skip semantics, reduced-motion grid, announcements | ⬜ #15 | plan · `gameplay-programmer` + `cs-accessibility-engineer` |
| B5 | Collection | rooms, per-set progress, milestones (door sign/lamp/rope), frame unlocks, empty rooms omitted | ⬜ #16 | plan · `ui-programmer` + `game-designer` |
| B6 | Reading room | 1200 detail, flip, share/save derivative, deep-link fallback, keyboard map | ⬜ #17 | plan · `ui-programmer` + `cs-accessibility-engineer` |
| B7 | Meta layer | Sonderausstellung, Sammelbogen, Der Aushang, card backs, completion (Ehrenmensch + Gesamtverzeichnis) | ⬜ #18 | plan · `systems-designer` + `writer` + `ui-programmer` |
| B8 | Hardening + PWA | perf budgets, a11y Standard audit, offline shell + derivative cache + install, deploy | ⬜ #19 | plan · `performance-analyst` + `accessibility-specialist` + `devops-engineer` |

Dependencies: B2 waits only on P4; B3→B8 are sequential on the branch, but their
**plans** may be written in parallel (`writing-plans` is read-only), and the design
tickets in §1 run in parallel throughout (L-005).

## 4 · Image pipeline

| # | Task | Status | Evidence / issue |
|---|---|---|---|
| I1 | `photos.php` derivatives (tile/pack/detail/download × jpeg/webp), no-original rule, error taxonomy, cache outside webroot, 16 shards, EXIF/metadata strip | ✅ | 949 assertions; #20 closed |
| I1a | Drop per-photo `srcset` (ADR-0004 §4) | ✅ | `grep -c srcset photos.php` → 0; #34 closed |
| I2 | Remove `imagedestroy()`, empty error bodies, no `X-Powered-By`, `display_errors` contained | ✅ | `grep -c imagedestroy` → 0 |
| I3 | Static pipeline: sips → sharp, 360/720/1200/1600, manifest v2 (`ver`, `images`) | ⬜ | #21 |
| I4 | **IONOS verification**: GD/WebP/AVIF, `memory_limit` ≥ 512 MiB, writable cache, Imagick/HEIC, `.htaccess` deny for originals + `.cache/` | 🟡 external | #22 (curls in §12.2) |
| I5 | Byte-bound gate in CI: every rendition ≤ ceiling and ≠ source; no `photos/<file>` requests in the UI ledger | 🟡 local proof done | pipeline verified by `verify.py`; CI gate is Q4/budget |
| I5b | Chivo subset ≤ 30 KB (currently 33,252 B) | ⬜ | #35 |

Harness: `security-audit` + `test-setup` + `perf-profile`; `cs-backend-engineer`
implements, `security-engineer` reviews the containment matrix, and every claim carries
a curl/byte table (already the pattern from I1).

## 5 · Quality

| # | Task | Status | Evidence / issue |
|---|---|---|---|
| Q1 | Vitest: pack draw (4, no repeat, rarity single-source), storage migration, contrast, i18n parity, copy-lint | ⬜ | #23 |
| Q2 | Playwright: golden journey, keyboard-only, reduced motion, focus-return matrix, error states, overflow matrix, swipe/chevrons | ⬜ | #24 |
| Q3 | Replace `scripts/qa.mjs` gaps | ✅ retired | v1 script archived; the gaps are Q1 (unit) + Q2 (e2e), not a third suite |
| Q4 | CI gate chain, eleven gates, no `--if-present` masking at merge time | ⬜ | #25 |
| Q5 | Cross-file selector-diff check | ✅ | `npm run gate:selectors` |
| Q6 | Canon gate + self-tests, jscpd threshold, knip, unused-CSS escalation | ✅ | `verify` green; 11 canon tests |
| Q7 | Negative proofs for every gate (legacy hex fails contrast, duplicate selector, unused CSS, raw value) | ✅ | `docs/build/b0-b1-verification.md` |

Harness: `qa-plan` + `test-setup` + `test-flakiness` + `test-evidence-review`;
`qa-lead` owns the plan, `cs-qa-automation-lead` the Playwright matrix, `qa-tester`
the cases. A gate is proven by a seeded failure, never by a green run alone.

## 6 · Measured debt (from baselines)

| # | Fix | Status | Source |
|---|---|---|---|
| M1 | Stop serving originals as card images (3.98 MB → ≤ 210 KB) | ✅ | pipeline I1 |
| M2 | Kill the duplicate LCP fetch (174 KB → 62 KB) | ⬜ #26 | perf baseline |
| M3 | CSS 65 KB raw → ≤ 45 KB; Chivo 33 KB → ≤ 30 KB | 🟡 CSS ✅ (5.10 KB gz) · font #35 | perf baseline |
| M4 | `--quiet` contrast failure (3.48–4.13:1) | ✅ | token 6.08–4.66:1 + gate |
| M5 | Reset without confirmation (Critical) | ⬜ #27 | a11y baseline |
| M6 | No alt text in the binder; focus never returns to the originating tile | ⬜ #28 | a11y baseline |
| M7 | Reduced motion still animates motes/spring | ⬜ covered | B4 acceptance + #24 reduced-motion spec; no separate ticket (same change) |

## 7 · Owner decisions

All delegated decisions are **closed**; `docs/decisions.md` is the register and the
owner does not approve, review or merge.

| ID | Ruling |
|---|---|
| D-01 | PWA: yes — offline shell, derivative cache, quiet update (ADR-0009) |
| D-02 | Chase card `elsa-01` "Blickkontakt-Expertin" |
| D-03 | Epithets: yes, on two surfaces |
| D-04 | Capstone line + Greek origin ("Ein Empfang um zwei Uhr nachts") |
| D-04b | **Die Sammlung / The Collection**; verb **gesammelt / collected** |
| D-05 | Copy deck §12 closed |
| D-06 | Gotcha Day ritual: candle at two, no counter, no reward |
| D-07 | Provisional set assignment (fixtures only; manifest `set` wins) |
| D-08 | Quality bar: no shortcuts; better beats faster |
| D-09 | Domain assumed `elsatheexplorer` — confirm before deploy |

Remaining external fact: D-09's public domain and the IONOS host capabilities (#22).

## 8 · Deliberately out of scope

Accounts, server state, analytics, currencies, energy/streaks, leaderboards, trading,
comments, seasonal events, full-resolution originals, live ops, monetization, and any
water-themed content (canon: Elsa hates water).

## 9 · Definition of done (v2)

- A visitor on a mid-tier phone sees the entrance hall in < 1 s on 4G, with no layout
  shift and no image larger than its rung's ceiling.
- Four cards reveal one after another, pull back into a 2×2 (row on desktop), and every
  card is reachable by keyboard, announced, and skippable.
- The collection is fully navigable, sets show progress, milestones fire once, and
  Elsas Ehrenmensch is reachable.
- No UI request ever returns an original photo.
- Standard accessibility tier verified (contrast, focus, announcements, reduced motion);
  reduced motion renders the final frame.
- All eleven CI gates green on the merged commit; PR review and the resolution table
  recorded; deployed to IONOS and checked with the §12.2 host curls.
- Every phase has a committed plan, a ledger without an open task, and a final
  whole-branch review on the PR.
