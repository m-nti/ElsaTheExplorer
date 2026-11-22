# Action Plan — Elsa the Explorer

> Living document. Status as of 2026-11-22.
> Sources of truth: `AGENTS.md`, `design/`, `docs/architecture.md`, `docs/adr/`,
> `docs/copy/copy-deck.md`, `docs/test-plan.md`.

## Status legend

- ✅ done and committed
- 🟡 in flight (agent running or partially applied)
- ⬜ not started
- 🔴 blocked on a decision

---

## 1. Documentation gates (finish before code)

| # | Task | Status | Notes |
|---|---|---|---|
| D1 | Reveal choreography rewrite: 4 cards, one-in-focus, camera pull-back, 2×2 mobile / row desktop, reduced-motion final frame | 🟡 | `design/ux/pack-opening.md` + `interaction-patterns.md` |
| D2 | Art bible §2/§7 alignment to the motion sheet + 4-card canon | 🟡 | §7 motion feel + §2 state 3; confetti rule settled |
| D3 | `AD-ART-BIBLE` gate re-run and sign-off recorded | ⬜ | header currently says "re-run pending" |
| D4 | `/ux-review all` re-run over the four specs | ⬜ | last run was pre-4-card/pre-voice |
| D5 | Cross-document `consistency-check` (canon: 4 cards, gesammelt, Abfahrtsaal, Ehrenmensch, one-`!`) | ⬜ | add a CI grep gate for the vocabulary |
| D6 | Copy deck §12 open items closed | 🔴 | reset register, capstone.lap, 50/75 % outfit clauses, demo.mixed, capstone.date, stage.cta, error register |
| D7 | ADRs 0003–0007 written (state/persistence, i18n, a11y, testing, release) | ⬜ | referenced by architecture; 0001/0002/0008 accepted |
| D8 | `design/registry/entities.yaml` created | ⬜ | rooms, sets, copy keys, storage keys, pack-size constant |
| D9 | Greek origin: epithet layout slot + capstone line approved | 🔴 | ux-designer needs a slot; owner approves capstone copy |
| D10 | Sound bible: audio-director sign-off; capstone voice line decision | 🔴 | v1 stays synthesized |
| D11 | README/PRD rewritten for the new stack and owner workflow | ⬜ | README still describes the v1 vanilla app |

## 2. PR #2 — merge gate

| # | Task | Status |
|---|---|---|
| P1 | Code/security blockers B1–B5 | ✅ fixed & pushed |
| P2 | Architecture blockers (12) — contract reconciliation | ✅ applied, needs re-review |
| P3 | Re-review by `cs-code-auditor` + `cs-architecture-reviewer` | ⬜ |
| P4 | Merge to `main` (ruleset: PR + 1 approval, admin bypass) | ⬜ |
| P5 | Add required status checks once CI exists | ⬜ |

## 3. Build phases (Svelte 5 + Vite + Panda)

| # | Phase | Deliverable | Depends on |
|---|---|---|---|
| B0 | Scaffold | `package.json`, `vite.config.ts`, `tsconfig`, `panda.config.ts`, `src/`, `design/tokens/`, ESLint/Stylelint/knip/**jscpd** wired to the new tree | P4 |
| B1 | Tokens + gates | typed palette/type/spacing + rarity table; **contrast gate must reject the legacy `--quiet`**; `staticCss` recipe safelist; motion tokens from `motion-sheet.md` | B0 |
| B2 | CardFace | fixed %-height zones, 4/5 photo window, 5-layer foil, tilt, focus anchor, error state | B1 |
| B3 | Entrance hall | static shell independent of the manifest; pack CTA; progress line; Zuwachs line; empty/error states | B2 |
| B4 | Pack theatre | 4-card sequential focus + pull-back; skip semantics; reduced-motion grid; announcements | B3 |
| B5 | Catalogue | rooms, per-set progress, milestones (door sign/lamp/rope), frame unlocks, empty rooms omitted | B4 |
| B6 | Reading room | 1200 detail, flip, share/save derivative, deep-link fallback, keyboard map | B5 |
| B7 | Meta layer | Sonderausstellung, Sammelbogen, Der Aushang, card backs, completion (Ehrenmensch + Gesamtverzeichnis) | B6 |
| B8 | Hardening | perf budgets, a11y Standard, PWA decision, deploy | B7 |

## 4. Image pipeline

| # | Task | Status |
|---|---|---|
| I1 | `photos.php` derivative endpoints, no-original rule, error taxonomy, cache outside webroot | ⬜ (spec ready: `docs/photo-pipeline-implementation.md`) |
| I2 | Remove `imagedestroy()` (PHP 8.6 notices) + `display_errors=0` on image paths | ⬜ |
| I3 | Static pipeline: sips → sharp, 360/720/1200/1600, manifest v2 (`ver`, `images`) | ⬜ |
| I4 | **IONOS host verification**: GD/WebP/AVIF, `memory_limit` ≥ 512 MiB, writable cache, `.htaccess` deny | 🔴 external |
| I5 | Byte-bound CI: every rendition ≤ ceiling and ≠ source bytes; no `photos/<file>` requests | ⬜ |

## 5. Quality

| # | Task | Status |
|---|---|---|
| Q1 | Vitest: pack draw (4), rarity single-source, storage migration, contrast gate, i18n parity, copy-lint | ⬜ |
| Q2 | Playwright: golden journey, keyboard-only, reduced motion, focus-return matrix, error states, overflow matrix, swipe/chevrons | ⬜ |
| Q3 | Replace `scripts/qa.mjs` gaps (PHP paths, share, reset, storage corruption) | ⬜ |
| Q4 | CI order: typecheck → stylelint → eslint → knip → **jscpd** → unit → build → e2e → axe → budgets | ⬜ |
| Q5 | Cross-file selector-diff check (Stylelint is per-file) | ⬜ |

## 6. Measured debt (from baselines)

| # | Fix | Source |
|---|---|---|
| M1 | Stop serving originals as card images (3.98 MB → ≤210 KB) | perf baseline |
| M2 | Kill the duplicate LCP fetch (174 KB → 62 KB) | perf baseline |
| M3 | CSS 65 KB raw → ≤45 KB; Chivo 33 KB → ≤30 KB | perf baseline |
| M4 | `--quiet` contrast failure (3.48–4.13:1) | a11y baseline |
| M5 | Reset without confirmation (Critical) | a11y baseline |
| M6 | No alt text in the binder; focus never returns to the originating tile | a11y baseline |
| M7 | Reduced motion still animates motes/spring | a11y baseline |

## 7. Owner decisions still open

1. **Copy deck §12**: reset-body register, 50/75 % outfit wording, `demo.mixed`, `capstone.date`, `stage.cta` register, error register.
2. **Capstone line** (Greek origin, PROPOSED): approve or rewrite.
3. **Epithet slot**: may cards carry an epithet line, and where?
4. **Chase card photo**: which portrait is *Das Hauptporträt*?
5. **Set assignment**: which photos belong to which room (owner editorial pass).
6. **PWA**: installable offline app — yes/no (deferred in the slate).
7. **Gotcha Day**: 14 May confirmed; ritual wording (candle at two) to approve.
8. **Repo/domain**: repo is `ElsaTheExplorer`; confirm the public domain name.

## 8. Deliberately out of scope

Accounts, server state, analytics, currencies, energy/streaks, leaderboards, trading,
comments, seasonal events, full-resolution downloads, live ops, monetization.

## 9. Definition of done (v2)

- A visitor on a mid-tier phone opens the site and sees the entrance hall in <1 s on 4G,
  with no layout shift and no image larger than its rung's ceiling.
- Four cards reveal one after another, pull back into a 2×2, and every card is reachable
  by keyboard, announced, and skippable.
- The catalogue is complete navigable, sets show progress, milestones fire once, and
  Elsas Ehrenmensch is reachable.
- No UI request ever returns an original photo.
- Standard accessibility tier verified (contrast, focus, announcements, reduced motion).
- All nine CI gates green; PR review recorded; deployed to IONOS.
