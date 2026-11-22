# Global agent instructions — snapshot

Snapshot of `~/.config/opencode/AGENTS.md` taken 2026-11-22. To install on another machine, copy this file to `~/.config/opencode/AGENTS.md`. Project-level `AGENTS.md` files add local rules; they do not replace these.

# Global instructions

These apply to **every project and every agent/subagent** on this machine.

## Standing rule — load all relevant skills together

Before starting any task, inventory the available skills and activate **every**
skill whose domain touches the task. Multiple skills can be active and loaded at
the same time by one agent; they compose rather than compete.

- Activating one relevant skill and stopping is a defect, not minimalism.
- A task that spans design, copy, architecture, QA or release normally needs
  several skills at once (for example `design-system` + `ux-design` +
  `localize` + `consistency-check`).
- Load the full relevant set first, apply each where it governs, and state in
  the report which skill governed which decision.
- Project-level instructions may add rules; they do not reduce this one.

## Standing rule — verify before claiming done

- Run the check you can run (tests, lint, build, grep gate) before reporting
  completion; if it cannot be run here, say so explicitly and mark it
  unverified rather than implying it passed.
- A rule without a mechanical gate erodes: when a convention matters, add a
  lint/grep/test that enforces it.

## Standing rule — agent-owned PR lifecycle (no human approval gate)

The owner does not review, approve or merge. Agents with the correct skills own
the whole lifecycle:

1. **Review**: reviewer agents (`cs-code-auditor`, `cs-architecture-reviewer`,
   plus a domain reviewer where relevant) post findings with `gh pr review`.
2. **Resolve**: after any fix push, the PR steward posts **one resolution
   comment** mapping every finding to its fix and evidence — `file:line`, commit
   SHA, and the command output that proves it. Deferred items are listed with the
   reason. "Everything fixed" is only claimed with that table attached.
3. **Re-review**: the steward requests a fresh review from the same reviewer set.
4. **Merge**: when blockers are cleared and gates pass, the steward merges
   (admin bypass is allowed where branch protection requires a second approval).
5. **If a gate cannot run, do not merge** — say which gate and why.

No merge without a recorded review and a resolution comment. No waiting on the
owner for approval.

## Standing rule — inventory skills AND agents before every task

Before any task, the conductor and every dispatched agent survey **both** the global and the
project catalogues, then load the right crew and the right skill suite.

**Skills** — check every discovery source:
`~/.config/opencode/skills/`, `~/.claude/skills/`, `~/.agents/skills/`, plugin-provided
skills (e.g. Superpowers), and the project's `.opencode/skills/`, `.claude/skills/`,
`.agents/skills/`.

**Agents** — check `~/.config/opencode/agents/`, the project's `.opencode/agents/`, the
built-in subagents (`general`, `explore`), and the plugin/agent roster installed globally.

Then:
1. Match the task's domains to the available skills; load **all** relevant ones together.
2. Pick the best-fitting subagent crew for each workstream (specialist over generalist), and
   name them in the plan.
3. **The conductor loads skills for its own work too** — it is not exempt because it
   delegates. Reading, reviewing, editing and deciding are tasks.
4. State the inventory result: which skills and which agents were considered, chosen, and
   why the rest were not.

No task starts before this inventory. A task that names no skills/agents has skipped it.

## Standing rule — watch CI on every push; red is not allowed to sit

After every push, run `gh pr checks <n>` (or `gh run list` for `main`). If a check fails:

1. Read the failure: `gh run view <run-id> --log-failed`.
2. If it is a **small, in-scope fix** (the fix-now gate), fix it in the same PR and push.
3. If not, file a ticket with the failure output and the blocker, and state in the PR that
   the check is expected-red until that ticket lands.
4. Never leave a red check unexplained. The PR steward runs `gh pr checks --watch` before
   merging and reports the final run.
5. A scheduled run checks `main` daily; red on `main` is a P0 — open a ticket immediately.

## Standing rule — fix small debt now; ticket only with evidence

When you notice a defect, inconsistency or small improvement while working, run this
gate **before** deciding it is "out of scope":

1. **Can it be fixed correctly in this change** — roughly ≤30 minutes, ≤50 lines, no new
   dependency, no schema/migration, no external verification, no design decision that
   changes the product? → **Do it now**, in the same commit/PR, and mention it in the
   summary. Do not file a ticket for something you could have fixed.
2. **If not, prove it.** Name the blocker precisely: missing dependency, migration,
   host/external fact, cross-document design change, or a file count that makes the diff
   unreviewable. File a ticket whose body carries that evidence as the reason.
3. **No prose debt.** A known small issue left in a document, a `TODO` comment, or a
   "note for later" is a defect. Fix it or ticket it.
4. **Don't inflate a focused change.** The test is not "is this related?" but "does fixing
   it change the risk profile of what I am already doing?" If yes, ticket it.
5. **Ticket debt is debt too.** A ticket needs binary acceptance criteria and a definition
   of done; a vague wish is not a ticket.

The default is **fix**, not defer. "Out of scope" requires the evidence in (2).

## Standing rule — parallelize independent work

Before starting, build the dependency graph. Every unblocked ticket starts now, in
parallel, one agent per ticket — `Ready` means "start it", not "queue it". Serializing
independent work is a defect; if only one ticket is In Progress while others are
unblocked, say why or start them. "Nobody assigned it" is not a dependency.

## Standing rule — ticket lifecycle is agent-owned

The owner does not create, move or close tickets. Agents do:

1. Every unit of work is an issue from the Task template, labelled
   `type:` / `area:` / `phase:` / `priority:`, and added to the project board.
2. Discovering work files a ticket immediately — review findings, measured defects,
   missing ADRs, deferrals.
3. Transitions are automatic: Todo → In Progress on start, → In Review when the PR
   opens, → Done on merge/close (`Closes #N`).
4. The PR steward reconciles the board at merge and files follow-ups for deferrals.

No user action is required at any point.

## Standing rule — commit and PR cadence

Work is committed in coherent checkpoints and pushed regularly; features land as
reviewed PRs, not one giant unreviewed drop. Every PR states its merge gate in the
body and its resolution status in a comment.
