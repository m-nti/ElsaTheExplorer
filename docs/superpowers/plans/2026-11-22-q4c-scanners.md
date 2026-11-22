# Q4c — Two Additive Scanners Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gate two defects no current gate can see — a reference to a file that moved, so the path in the document no longer resolves, and a plan that calls a merged PR "in review" — without touching a single existing gate.

**Architecture:** Two stand-alone Node ESM CLIs beside `scripts/table-integrity.mjs`, sharing one contract (`--root`, `--json`, exit 0 clean / 1 violations / 2 usage). Each is declared in `.github/gates.json` and run by `ci.yml` as a bare `run: npm run <script>` step, which is the only shape `scripts/ci-gates.mjs` accepts as evidence. Vitest proves each in both directions: a seeded fixture must fail with `file:line`, and this repository must be clean.

**Tech Stack:** Node 26 (ESM, `node:fs` only), Vitest 5.1.1 (`canon` project), npm 11, GitHub CLI for the merged-PR cross-check.

**Spec:** issue #61; `.github/gates.json`; `scripts/ci-gates.mjs` (the manifest's contract); `tests/canon/table-integrity.test.mjs` (the fixture-and-spawn pattern this follows).

**Closes:** #61. **Depends on:** #45 (merged, `dd5f7b7`) for the manifest discipline.

## Global Constraints

- Node 26 / npm 11 only; no new dependency — `node:fs`, `node:path`, `node:child_process` are enough.
- Additive: `gates.json` gains entries, `ci.yml` gains steps. No gate is deleted, renamed or loosened; the gate count only goes up.
- Canon: **Die Sammlung**, **gesammelt**, **Der Abfahrtsaal**, four cards per pack, no water content, at most one `!` per surface and never in an error message or an `aria` string (`scripts/canon-check.mjs`).
- A gate is proven by a seeded failure, never by a green run alone (`docs/build/b0-b1-verification.md` §Q7).
- A gate that cannot run must say so and must not paint a pass: plan-status degrades to a **warning** without `gh` or a network, and never to a silent success.
- Paths are compared **case-sensitively** on every platform, so a reference that resolves on Windows cannot pass here and break on `ubuntu-latest` (the class PR #72 cleaned up in `scripts/canon-check.mjs`).
- `npm run verify` green at the end; every commit names #61.

## Review Focus

- **Which backticked paths are claims** — this repository is mid-refactor: 150 backticked paths name files that do not exist yet (a plan's `Create:` list, an ADR's module design). A scanner that demands they exist is red on the commit that adds it. The rule that separates them needs no allowlist: a backticked path is a claim when the repository already holds a **file of that name elsewhere**, which is exactly the moved-file case. Pinned by `paths-clean` and by the real-tree case.
- **The move this repository actually made** — v1 lives in `legacy/`, so 46 sections still pointed at the v1 asset tree and at the retired `qa.mjs` script. Those are the first real findings; the fix is `legacy/`, not an exemption (Task 2).
- **Template and glob backticks** — `docs/plans/YYYY-MM-DD-<slug>.md`, `src/**/*.css`, `tests/unit/[system]/`, `docs/adr/ADR-0001…0011`. Test: `paths-clean` carries one of each.
- **Prose that merely contains "review"** — the delivery plan says "PR #2 produced two moving review heads". A claim parser that matches a bare `review` turns a correct sentence red. Test: `plan-status-clean` carries that exact sentence.
- **A relative link inside a fenced block** — the plans show the failing form as an example. Test: `paths-seeded` carries the broken link both live and fenced.
- **Anchors and line suffixes** — a target ending in `#section`, `:12`, `:210,440` or `:1095-1102` names a file plus a position; the position is stripped, not resolved. Test: `paths-clean`.
- **No `gh`, no network** — CI holds `permissions: contents: read` and no `GH_TOKEN`, so the merge cross-check cannot reach the API there. Test: a bogus `--gh` path exits 0 with a warning naming the reason.

---

### Task 1: `check:paths` — a reference to a file that moved

**Files:**
- Create: `scripts/check-paths.mjs`
- Create: `tests/canon/check-paths.test.mjs`
- Create: `tests/canon/fixtures/paths-seeded/broken.md`
- Create: `tests/canon/fixtures/paths-seeded/docs/exists.md`
- Create: `tests/canon/fixtures/paths-seeded/docs/archive/action-plan.md`
- Create: `tests/canon/fixtures/paths-clean/good.md`
- Create: `tests/canon/fixtures/paths-clean/docs/exists.md`
- Create: `tests/canon/fixtures/paths-clean/docs/with space.md`
- Create: `tests/canon/fixtures/paths-clean/legacy/archived.md`
- Modify: `package.json` (add `check:paths`)

**Interfaces:**
- Produces: `node scripts/check-paths.mjs [--root <dir>] [--json]` → exit 0 clean, 1 violations, 2 usage; `--json` prints `{ status, files, claims, notYet, violations: [{ file, line, target, kind, elsewhere }] }` where `kind` is `link` or `path` and `file` is relative to the repository root with forward slashes.
- Produces: the npm script `check:paths`.

- [ ] **Step 1: Write the seeded fixtures**

`paths-seeded/broken.md` — one required case per line, so the assertion pins line numbers:

````markdown
# Seeded broken targets

Live link to a file that moved: [the action plan](docs/action-plan.md).

A backticked path to the same moved file: `docs/action-plan.md`.

Case-only difference: `docs/EXISTS.md` (the file is `docs/exists.md`).

A file no one has ever built: `src/lib/pwa/cachePolicy.ts`.

A directory that exists, treated as a link: [docs](docs/).

Wrong case in a relative link: [exists](Docs/exists.md).

```
[fenced example, not a link](docs/gone-too.md)
`design/never-there.md`
```
````

`paths-seeded/docs/archive/action-plan.md` holds the file that moved, so its name is held elsewhere; `paths-seeded/docs/exists.md` is the case-case target. The line numbers the test pins are 3 (moved link), 5 (moved backtick), 7 (case-only backtick), 13 (case-only link); line 9 is the planned file and line 11 the existing directory.

`paths-clean/good.md` carries the negative cases: an anchored link, a `:12` suffix, a `:210,440` set, a bare directory, a `%20` space, a planned file no one has built, four template/glob spans, and three outbound links. `paths-clean/legacy/archived.md` holds a dead link that must never be read.

- [ ] **Step 2: Write the failing tests**

`tests/canon/check-paths.test.mjs` — spawn the CLI (the exit code is the contract), five cases: the seeded violation list exactly, the stderr message with the relocation hint, the clean fixture with `notYet === 1`, exit 2 on a missing root, and the repository itself clean with more than 50 claims.

- [ ] **Step 3: Run the tests and watch them fail**

Run: `npx vitest run --project canon tests/canon/check-paths.test.mjs`
Expected: FAIL — `Cannot find module …/scripts/check-paths.mjs`, so every spawned result is null.

- [ ] **Step 4: Implement `scripts/check-paths.mjs`**

Scan the tracked Markdown set (`git ls-files`, filtered by `SKIP_DIRS`), skipping fenced blocks, `legacy/` and `fixtures/`. Per line, collect:

1. **links** — the `[text](…)` and `![alt](…)` forms plus inline `href`/`src`; a link must resolve, against its own directory.
2. **paths** — a backticked span rooted at `docs/`, `design/`, `src/`, `scripts/`, `tests/`, `public/`, `photos/`, `assets/` or `.github/`; skipped when it carries a template or glob character.

Normalise by stripping a fragment, a query, and a `:line` or `:line-set` suffix. Resolve **segment by segment with `readdirSync`** so the comparison is case-exact on Windows too. A backticked path that does not resolve is a violation only when the repository holds a file with that basename anywhere else — that is the moved-file claim, and `elsewhere` reports where it lives now.

- [ ] **Step 5: Run the tests and watch them pass, then fix what the real tree reveals**

Run: `npx vitest run --project canon tests/canon/check-paths.test.mjs`
Expected: PASS once Task 2 has cleared the real tree.

- [ ] **Step 6: Register the script**

`package.json`: `"check:paths": "node scripts/check-paths.mjs"`.

---

### Task 2: Make the real tree clean — 42 lines of stale paths

**Files:** `AGENTS.md`, `PRD.md`, `design/accessibility-requirements.md`, `design/art/art-bible.md`, `design/audio/sound-bible.md`, `design/features/archive-fiction.md`, `design/gdd/collection-meta.md`, `design/player-journey.md`, `design/ux/interaction-patterns.md`, `docs/adr/ADR-0001-stack.md`, `docs/adr/ADR-0005-i18n.md`, `docs/adr/ADR-0006-testing-ci.md`, `docs/adr/ADR-0009-pwa.md`, `docs/architecture.md`, `docs/audits/a11y-baseline.md`, `docs/audits/perf-baseline.md`, `docs/superpowers/plans/2026-11-22-v2-delivery.md`.

The first run names 53 stale references in four classes, every one a real defect:

| Class | Count | Fix |
| --- | --- | --- |
| v1 assets moved into the archive | 43 | the v1 asset tree and `qa.mjs` → under `legacy/` |
| copy deck described at the wrong root | 2 | `docs/copy/` → `design/copy/` |
| decisions register described at the wrong root | 1 | `design/` → `docs/` |
| architecture described as a directory | 1 | `docs/architecture/…` → `docs/architecture.md` |

Rules for the pass: change the path token only, never the prose; no line is reflowed; a line that reads as history ("v1 was verified by …") keeps its meaning, so the path becomes the archived one. The `PRD.md` R10 row keeps the v1 open-graph path because it names the **future** deployed URL, not an archived file — verify it is not reported before leaving it.

**Ruling:** the one-line path fix in `docs/superpowers/plans/2026-11-22-v2-delivery.md` is inside a plan that is otherwise edited on `docs/*` branches only. Cost if wrong: a one-line diff on a living document. The alternative is an exemption in a brand-new gate, which costs the gate.

- [ ] **Step 1: Run the gate and keep the output**

Run: `node scripts/check-paths.mjs` — 53 references, each with `file:line` and the path where the file lives now. This output is the PR evidence.

- [ ] **Step 2: Apply the four classes, then re-run**

Run: `node scripts/check-paths.mjs`
Expected: `check-paths: clean (… claims in 48 files, … reference(s) to paths not built yet)`.

- [ ] **Step 3: Review the diff by hand**

Run: `git diff -U0 -- AGENTS.md PRD.md design docs`
Expected: one changed line per fix, no reflow, no prose edit beyond the path token.

---

### Task 3: plan-status — a plan may not call a merged PR "in review"

**Files:**
- Create: `scripts/plan-status.mjs`
- Create: `tests/canon/plan-status.test.mjs`
- Create: `tests/canon/fixtures/plan-status-seeded/plan.md`
- Create: `tests/canon/fixtures/plan-status-clean/plan.md`
- Create: `tests/canon/fixtures/plan-status-prs.json`
- Modify: `package.json` (add `gate:plan-status`)

**Interfaces:**
- Produces: `node scripts/plan-status.mjs [--root <dir>] [--prs <json>] [--gh <path>] [--json]` → exit 0 clean or degraded, 1 mismatch, 2 usage; `--json` prints `{ status: "clean" | "mismatch" | "skipped", reason, prs, mentions, violations: [{ file, line, pr, claim, actual }] }`.
- Produces: the npm script `gate:plan-status`.
- Consumes: `gh pr list --state merged --json number,mergedAt --limit 500`, or a `--prs` fixture shaped `{ "merged": [59, 64], "open": [61] }`, which is how the tests keep the network out of the gate.

- [ ] **Step 1: Write the fixtures**

`plan-status-prs.json` declares 501 and 503 merged, 502 open — numbers no PR in this repository will ever hold.

`plan-status-seeded/plan.md` states one claim of each direction plus two lines that must stay quiet; the shape is:

````markdown
| Ticket | Status |
| --- | --- |
| Q4b | PR #<merged-one> in review |
| Q4c | PR #<open-one> merged |
| Q4a | PR #<merged-other> ✅ |
| #45 | PR #<merged-one> produced two moving review heads and a review of a stale commit |
````

Rows 5 and 6 are the two contradictions; the third row is consistent and the fourth is prose (no token in its clause). The numbers live in the fixture, not here, so this plan cannot contradict the fixture it describes.

`plan-status-clean/plan.md` flips the two claims so both are true, and repeats the prose line, which must not become a third claim.

- [ ] **Step 2: Write the failing tests**

`tests/canon/plan-status.test.mjs`, four cases: the seeded list exactly (line, PR, claim), the clean fixture quiet, the degrade path (`--gh` pointed at a name that does not exist → exit 0, `status: "skipped"`, stderr contains `plan-status: WARNING`), and this repository's plans clean against the fixture.

- [ ] **Step 3: Run the tests and watch them fail**

Run: `npx vitest run --project canon tests/canon/plan-status.test.mjs`
Expected: FAIL — `Cannot find module …/scripts/plan-status.mjs`.

- [ ] **Step 4: Implement `scripts/plan-status.mjs`**

Read every `*.md` directly under the plan root, default `docs/superpowers/plans`. Build the merge set from `--prs` or from `gh pr list` with a 15 s timeout; on a missing binary, a non-zero exit or unparseable output print `plan-status: WARNING — could not read merged PRs (<reason>); the plan claims are unverified` and exit 0.

Per line, find `PR #<n>` and then a status token in the same clause after the mention (stop at `|`, `.`, `;`, end of line): `in review`, `in-review`, `awaiting review`, `review pending`, `🟡`, `⬜`, `open` → claim `review`; `merged`, `landed`, `✅`, `done` → claim `merged`. A mention with no token in its clause is prose. Fail when the claim contradicts the set, printing `<file>:<line>: PR #<n> is merged but the plan says "in review"`. Read the set with `gh pr list --state all --json number,state` so the open direction is available from the same call.

- [ ] **Step 5: Run the tests and watch them pass**

Run: `npx vitest run --project canon tests/canon/plan-status.test.mjs`
Expected: PASS, four tests.

- [ ] **Step 6: Register and commit**

`package.json`: `"gate:plan-status": "node scripts/plan-status.mjs"`.

---

### Task 4: Wire both gates additively and prove the chain

**Files:**
- Modify: `.github/gates.json` (two enforced entries, nothing else)
- Modify: `.github/workflows/ci.yml` (two bare steps)
- Modify: `tests/README.md` (gate order + commands)
- Test: `tests/unit/ci-gates.test.ts` is not edited — the manifest check proves the wiring.

- [ ] **Step 1: Declare both gates**

After `table-integrity`: `{ "id": "internal-paths", "script": "check:paths" }` and `{ "id": "plan-status", "script": "gate:plan-status" }`. Nothing removed, nothing reordered, `pending` untouched.

- [ ] **Step 2: Run the manifest check before `ci.yml` is edited — watch it fail closed**

Run: `npm run ci:gates`
Expected: FAIL, `enforced gate "internal-paths": ci.yml has no bare "run: npm run check:paths" step`, and the same for `plan-status`. That is #45's ratchet; the output is PR evidence.

- [ ] **Step 3: Add the two steps to `ci.yml`**

After the `Markdown table integrity` step: `- name: Internal paths (links and backticked repo paths)` / `run: npm run check:paths`, then `- name: Plan status vs. merged PRs` / `run: npm run gate:plan-status`. Two lines each; no other step touched.

- [ ] **Step 4: Prove the chain**

`npm run ci:gates` → 16 enforced, 4 pending. `npm run verify` → 16 gates green.

**Ruling:** AC #5 of issue #61 says "15 gates", counting one addition. Both checks are declared because a check that runs in `verify` but is absent from the manifest is invisible to the ratchet — the defect #45 removed. Cost if wrong: one extra manifest entry. Cost of the alternative: an unenforced check that looks enforced.

**Blocker, expected:** the token carries `gist`, `read:org`, `repo` and **not** `workflow`, so step 3 cannot be pushed. The `ci.yml` hunk is committed locally, the push is attempted once to capture the real rejection, and the branch is pushed at the pre-`ci.yml` commit. The PR body names the blocker with `gh auth refresh -s workflow`.

- [ ] **Step 5: Commit**

`chore(#61): wire check:paths and plan-status into the gate chain`.

---

## Self-review

- **Spec coverage:** #61 §1 → Tasks 1–2 (links, backticked paths, `file:line`, fences, `legacy/`, seeded fixture, real tree). §2 → Task 3 (`PR #<n>` extraction, merged cross-check, fail-or-warn, degrade without `gh`). AC 1 → Task 4. AC 2 → Task 2. AC 3 → Tasks 3–4. AC 4 → Task 3 Step 3. AC 5 → Task 4 Step 4.
- **Deviation recorded:** the gate-count ruling above, and the claim rule in Task 1 (a backticked path is a claim when its basename is held elsewhere). Both are in the PR body, not only here.
- **Type consistency:** both CLIs share `--root`, `--json`, `status` and the 0/1/2 exit codes; `check-paths` reports `kind`, `plan-status` reports `claim`.
- **Review Focus:** each line names the fixture that pins it. The one rule that cannot be pinned by a fixture — "a wholesale directory move is caught by the link family, not the backtick family" — is stated in the script header so it is not discovered later.
