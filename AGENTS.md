# Elsa the Explorer — agent instructions

A card library about Elsa (the dog): the collection is the product, Elsa is the
collection mechanism. Full refactor in progress on a decided stack.

## Standing rule — activate all relevant skills, together

Before starting work, inventory the installed game-studios skills
(`~/.config/opencode/skills/`) and activate **every** skill relevant to the task at
hand (via the `skill` tool, or by reading its `SKILL.md`). Name the activated
skills in the final report. Skipping a relevant skill is a reportable defect.

**Skills are not mutually exclusive.** Multiple skills can be activated and loaded
at the same time by one agent, and they compose: a design pass may need
`design-system` *and* `ux-design` *and* `localize` *and* `consistency-check`
together. Activating one relevant skill and stopping is a defect, not minimalism.
Load the set, apply each where it governs, and say which governed what.

## Project facts (binding)

- **Product**: Elsa the Explorer — a card library / Sammelwerk. NOT a gift toy.
  Museum-catalogue register with warm dry humor. DE/EN from the start.
- **Stack (owner-approved, newest majors, verified 2026-11-22)**: Svelte 5
  (5.59.1) + Vite 8.3.8 + TypeScript 7.0.2 (strict, native compiler) + Vitest
  5.1.1 + Playwright 1.65.1 + @sveltejs/vite-plugin-svelte 7.3.1 + sharp 0.35.5
  (dev). Plain Vite app, no SvelteKit, no SSR. Static deploy to IONOS.
- **Photos pipeline**: `photos.php` stays the runtime manifest source (owner
  FTP-drops photos, no redeploy). Node/sharp scripts generate thumbnails and
  crop anchors for local dev/QA only. Manifest gains optional `set`, `focus`,
  `chase` fields, backward compatible.
- **Data**: first-party localStorage only (`lucky-elsa.*`), no accounts, no
  analytics, no tracking. Reset clears all keys with confirmation.
- **Canon — water (owner ruling, 2026-11-22)**: **Elsa hates water. The archive
  contains NO wet-dog, rain, mud or bathing content — no water-themed cards, copy
  or jokes.** The sixth room is **Der Abfahrtsaal / The Departure Hall** (car
  rides, the window-nose, arriving places), replacing Die Nassabteilung / The
  Wet Collection everywhere. Legacy card-bank water jokes (e.g. "Badegast des
  Jahres", "Unwetterwarnung Stufe Pfote") are retired and must be rewritten in
  the build phase.
- **Visual**: refine the dark collector's parlour — the card is the only lit object in the
  room. **Styling system (ADR-0002, ratified by a 3-specialist panel): Panda CSS 2.0**
  (Rust engine; typed tokens + typed rarity recipes, static artifact output, zero runtime)
  with **bespoke foil art in Svelte component-scoped CSS** that may consume tokens only via
  `var()`. Enforcement belt is mandatory CI: Stylelint (`var()`-only values in scoped CSS,
  duplicate selectors as errors), a cross-file selector-diff check, Svelte unused-CSS
  warnings escalated to errors, a Vitest contrast gate computing WCAG ratios from
  `tokens.ts` (a sub-4.5:1 token fails the build), knip for dead tokens/exports. No runtime
  CSS-in-JS; utility frameworks (Tailwind v4 et al.) evaluated and rejected. Accessibility
  tier: **Standard** (committed in `design/accessibility-requirements.md`).

## Standing rule — PR review before merge

Every pull request is reviewed by dedicated reviewer agents/skills, never merged
on the author's own say-so. Before merge:

1. Activate `code-review` and, where the diff touches IO, paths, auth or data,
   `security-audit`.
2. Run at least one reviewer agent — `cs-code-auditor` for code/config, and
   `cs-architecture-reviewer` when ADRs, contracts or cross-document
   consistency change. Docs-only PRs still get a consistency review.
3. Post the review on the PR (`gh pr review …`), with findings tied to files
   and lines; blockers get `--request-changes`.
4. No merge until blockers are cleared and the review is recorded on the PR.

## Standing rule — agent-owned PR lifecycle (no human approval gate)

The owner does not review or approve. A PR steward agent owns the lifecycle end to end:

1. **Review**: reviewer agents (`cs-code-auditor`, `cs-architecture-reviewer`, plus a
   domain reviewer where relevant) post findings with `gh pr review`.
2. **Resolve**: after any fix push, the steward posts **one resolution comment** mapping
   every finding to its fix and evidence — `file:line`, commit SHA, and the command output
   that proves it. Deferred items are listed with the reason. "Everything fixed" is only
   said with that table attached.
3. **Re-review**: the steward requests a fresh review from the same reviewer set.
4. **Merge**: when blockers are cleared and the gates pass, the steward merges (admin bypass
   is allowed where branch protection requires a second approval).
5. **If a gate cannot run, do not merge** — say which gate and why.

No merge without a recorded review and a resolution comment. No waiting on the owner.

## Standing rule — every build starts with a committed plan

Implementation follows the Superpowers harness, in this order:

1. `brainstorming` for anything new or contested.
2. `using-git-worktrees` — one isolated worktree and branch per ticket; never implement
   on `main`.
3. `writing-plans` → a committed plan at `docs/superpowers/plans/YYYY-MM-DD-<slug>.md`,
   with the header, Global Constraints, Review Focus and bite-sized TDD tasks (exact
   paths, interfaces, the failing test). No plan, no implementation.
4. `subagent-driven-development` — a fresh implementer per task, a task review after
   each, a final whole-branch review, and a ledger at
   `.superpowers/sdd/<plan-slug>/progress.md` (git-ignored).
5. `test-driven-development` for each task; `systematic-debugging` before any fix.
6. `requesting-code-review` / `receiving-code-review` with the project reviewers, then
   `verification-before-completion` with pasted output, then
   `finishing-a-development-branch`.

The harness is the method; the standing rules below are the policy. Ambiguity is ruled
on and recorded in the ledger, not escalated — except force-push, history rewrite,
deleting owner data, an FTP deploy over `photos/`, or a plan where every path is a
guess. The current plan in `docs/superpowers/plans/` §0 is the full contract.

## Standing rule — commit and PR cadence

Work is committed in coherent checkpoints and pushed regularly; features land as reviewed
PRs, not one giant unreviewed drop. Every PR states its merge gate in the body and its
resolution status in a comment.

Every push runs `.githooks/pre-push` (`git config core.hooksPath .githooks`, set by
`npm run prepare`): a clean tree, the linux/x64 lockfile check, and `npm run verify` —
the same gates CI runs. A deliberate bypass is `SKIP_VERIFY=1` and must be named in the
PR. A red CI run on work pushed with the hook skipped is attributed, not shrugged at.

## Standing rule — inventory skills AND agents before every task

Before any task, the conductor and every dispatched agent survey both catalogues, then load
the right crew and the right skill suite.

- **Skills, global:** `~/.config/opencode/skills/`, `~/.claude/skills/`, `~/.agents/skills/`,
  plugin-provided (Superpowers, Game Studios).
- **Skills, project:** `.opencode/skills/`, `.claude/skills/`, `.agents/skills/`.
- **Agents:** `~/.config/opencode/agents/` (49 studio agents + cs-* crew), project
  `.opencode/agents/`, built-in `general`/`explore`.

Then: match task domains → load all relevant skills together; pick the best-fitting
subagent crew per workstream (specialist over generalist); name both in the plan; and the
**conductor loads skills for its own work too** — it is not exempt because it delegates.
State what was considered, chosen, and why the rest were not. No inventory, no task.

### Ownership: the studio agent owns, the cs-* agent cross-checks

The game-studios roster is the domain expertise for this product; the cs-* roster is the
cross-check. One exception: the PHP runtime service (`photos.php`) is owned by
`cs-backend-engineer` — it is server code, not game content — while the studio
`tools-programmer` owns the sharp CLI beside it. A workstream staffed only with cs-*
agents has otherwise skipped this rule.

This table is a compact summary; §0.5 of the current plan in `docs/superpowers/plans/` is authoritative where the
two differ (it also carries the per-workstream skill list).

| Workstream | Studio owner | Cross-check |
|---|---|---|
| UX, copy, narrative | `ux-designer`, `writer`, `narrative-director` | `localization-lead` |
| Art, foil, card visual | `art-director`, `technical-artist` | `cs-design-lead` |
| Card / pack / collection UI | `ui-programmer`, `gameplay-programmer` | `cs-accessibility-engineer`, `cs-code-auditor` |
| Audio | `sound-designer`, `audio-director` | `cs-code-auditor` |
| Image pipeline & tooling | `tools-programmer`; `cs-backend-engineer` for the PHP service | `security-engineer` |
| Tests, CI, release | `qa-lead`, `qa-tester`, `release-manager`, `devops-engineer` | `cs-qa-automation-lead`, `cs-release-manager`, `cs-devops-engineer` |
| Perf & a11y | `performance-analyst`, `accessibility-specialist` | `cs-accessibility-engineer` |

**Rejected for this product** (name them in the inventory, do not staff them): Godot /
Unity / Unreal / UE specialists, `network-programmer`, `ai-programmer`, `level-designer`,
`economy-designer`, `live-ops-designer` — no engine, no AI, no 3D levels, no live economy,
no seasonal content. `prototyper` only before a vertical slice exists.

Each ticket names its studio owner **and** its reviewer in the issue; the PR review comes
from the cross-check column, not from the author's own roster.

## Standing rule — watch CI on every push; red is not allowed to sit

After every push: `gh pr checks <n>`; on failure read `gh run view <run-id> --log-failed`.
Fix small in-scope failures in the same PR; otherwise ticket with the failure output and say
in the PR that it is expected-red until that ticket lands. The steward watches before merge
and reports the final run. A daily scheduled run checks `main`; red on `main` is P0.

## Standing rule — fix small debt now; ticket only with evidence

Before declaring anything "out of scope", run the gate:

1. **Can it be fixed correctly in this change?** (≈≤30 min, ≤50 lines, no new dependency,
   no migration, no external verification, no product-level design change) → **fix it
   now**, in the same commit/PR, and say so in the summary.
2. **If not, prove it.** Name the blocker — dependency, migration, host fact, cross-document
   design change, or an unreviewable diff — and file a ticket whose body carries that
   evidence.
3. **No prose debt:** no "note for later", no TODO without an issue reference. Fix or ticket.
4. **Don't inflate a focused change:** fix it only if it does not change the risk profile of
   the work in flight; otherwise ticket it.
5. **Ticket debt is debt too:** binary acceptance criteria + definition of done, or it is not
   a ticket.

The default is **fix**, not defer.

## Standing rule — parallelize independent work (no artificial serialization)

Before starting, build the dependency graph of the open tickets. Then:

- **Every unblocked ticket starts now, in parallel, one agent per ticket.** If four tickets
  have no unmet dependency, four agents run.
- **`Ready` means "start it", not "queue it".** Only genuinely blocked tickets sit in
  `Backlog`; a long `Ready` column is a smell.
- **Serializing independent work is a defect**, the same as skipping a skill. If only one
  ticket is `In Progress` while others are unblocked, the plan is wrong — state why each
  remaining ticket is blocked, or start it.
- Dependencies are declared on the issue (`Dependencies` field). "Nobody assigned it" is
  not a dependency.

## Standing rule — ticket lifecycle is agent-owned

The owner does not create, move or close tickets. Agents do, autonomously.

**Board:** https://github.com/users/m-nti/projects/2
**Template:** `.github/ISSUE_TEMPLATE/task.yml` (blank issues disabled).
**Labels:** `type:*` (feature, bug, chore, spike, docs), `area:*` (design, frontend,
backend, qa, docs, infra, narrative, audio), `phase:*` (foundation, design-gates,
scaffold, build, polish, release), `priority:*` (P0, P1, P2).

1. **Every unit of work is an issue.** Write the body as: Context → Scope/non-goals →
   Acceptance criteria (binary, one per line) → Evidence/DoD → Dependencies → References.
   Title format `[AREA] Imperative summary` (e.g. `[B4] Pack theatre: 4-card focus reveal`).
2. **Discovering work files a ticket immediately** — a review finding, a measured defect,
   a missing ADR, a deferral. Prose in a doc is not a tracker.
3. **Transitions are automatic:**
   - start → board **In Progress**, assign the working agent/author;
   - **several issues may be In Progress at once** — one per active agent/session; the
     board is expected to show parallel workstreams, not a single lane;
   - PR opened → **In Review**, PR body says `Closes #N`;
   - merge/close → **Done** (the PR closes it), and the steward files follow-ups for
     anything deferred.
4. **The PR steward reconciles the board at merge**: linked issues closed, status set,
   partial work split into remaining issues.
5. **No user action is required** at any point. If a tracker operation needs a permission
   the current token lacks (e.g. `project` scope), say so once with the exact command and
   continue filing issues in the repo.

## Standing rule — no small-project bias

Treat this as a production product, always. When choosing tooling, architecture or
process: pick the **best, future-proof, scalable** option; "overkill" and "too much
for a small project" are NOT valid reasons to downgrade a decision. If a choice adds
real capability, take it and pay its (documented) complexity cost — via an ADR with
the fallback ladder spelled out.
- **Constraints from PRD.md §5/§7 remain binding** (privacy, IONOS, solo
  maintainer).

## Where things live

- `design/` — game brief, GDDs, UX specs, art bible, accessibility
  (authored by studio agents; `/ux-review` validates specs against
  `design/ux/interaction-patterns.md` and the committed a11y tier)
- `docs/architecture.md`, `docs/adr/` — architecture and decisions
- Framework source, templates and skills:
  `~/.config/opencode/game-studios/source/.claude/`
- CSS note: the LAST "Open-card fit and pack theatre" block in
  `legacy/assets/css/style.css` is the active layout; earlier `.lightbox` rules are
  dead (full refactor will remove them).
