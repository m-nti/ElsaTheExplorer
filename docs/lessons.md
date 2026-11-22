# Lessons

Operational lessons from this project. Each entry is a rule, the evidence that
produced it, and how to apply it. Standing rules live in `AGENTS.md`; this file
keeps the why.

---

## L-001 — One agent, many skills

**Rule.** Multiple skills can be activated and loaded at the same time by a single
agent. When more than one is relevant, load the whole relevant set — never just
one.

**Evidence.** Across this project's agent runs, several subagents activated a
single skill (`design-system`, `localize`, or `art-bible`) while doing work that
plainly needed more: a copy sweep needed `localize` **and** `consistency-check`;
a feature reconciliation needed `design-system`, `scope-check`, and `qa-plan`; a
GDD edit needed `design-system` and `map-systems`. The result was avoidable drift
(e.g. string-of-record conflicts that a consistency pass would have caught,
phase-marker contradictions a second lens would have flagged).

**How to apply.**
- Start by listing the skills whose domain touches the task.
- Activate each one; they compose rather than compete.
- In the report, say which skill governed which decision.
- A report naming only one skill on a multi-domain task is incomplete.

**Anti-patterns.** "I only need the authoring skill." / "One skill is enough to
be safe." / Loading a skill but not applying its checklist.

---

## L-002 — Write-first on long documents

**Rule.** When a subagent edits large documents, tell it to write first and verify
last, with exact line/site lists; never let it re-read whole files to "get
context".

**Evidence.** Repeated subagent step-limit failures happened in the read phase of
propagation passes over 500–1,100-line documents. The same work succeeded when
split into one file per agent with explicit site lists.

**How to apply.** One file (or one small cluster) per agent; exact old→new strings
in the brief; `grep` to locate, then edit; verification pass at the end.

---

## L-003 — A rule without a gate erodes

**Rule.** Every canon rule needs a mechanical check (grep, lint, test, CI gate) or
it will drift within one editing pass.

**Evidence.** The verb change, the "Heft" retirement, and the exclamation rule each
reappeared in files that had already been "fixed", because the rule was stated but
not enforced. The copy-deck gate and `U-I18N-17` exist because of this.

**How to apply.** When a canon changes, add: the string/term to the deck, a grep
gate, and (where applicable) a test assertion.

---

## L-004 — A fix is not "done" until the review says so, with evidence

**Rule.** After addressing review findings, post **one resolution comment** on the PR
mapping every finding → status (FIXED / DEFERRED / NOT FIXED) → evidence: `file:line`,
commit SHA, or command output. Never claim "everything fixed" without that table.

**Evidence.** PR #2's blockers were fixed across several commits, but no resolution
comment existed — so the state was unverifiable from the PR itself. A verification pass
then found two findings (print-sheet eager images, hard-coded print hex values) that had
been assumed fixed and were not. Both were real; both were fixed only after the table
forced an item-by-item check.

**How to apply.** The PR steward owns this. Rounding up is the failure mode: a finding is
FIXED only when the evidence is attached, and "deferred" is always named with a reason.
The merge gate is: every finding accounted for + fresh review + gates green.

---

## L-005 — Independent work runs in parallel; "Ready" is not a queue

**Rule.** Build the dependency graph before starting. Every unblocked ticket starts now,
one agent per ticket. Serializing independent work is a defect.

**Evidence.** 27 tickets were filed; the first board sync set six P0s to *Ready* and
**nothing** to *In Progress*. The owner caught it: "why is there no issue in progress?"
and "are you sure there is only 1 thing that can be currently worked on?" In fact D3
(art gate), D5 (canon CI), D7 (ADRs) and I1 (photos.php) had no dependency on the
scaffold and could have started immediately. The queue was invented, not imposed by the
work.

**How to apply.** At planning time, list each ticket's unmet dependencies. Start
everything with none. Only blocked tickets wait, and the issue says what blocks them.
If the board shows one In Progress while others are unblocked, that is the bug.

---

## L-006 — The default is "fix it now", not "file a ticket"

**Rule.** Before deferring any small defect or inconsistency, run the fix-now gate:
≤30 minutes, ≤50 lines, no new dependency, no migration, no external verification, no
product-level design change → fix it in the same change. Deferring requires **evidence**
of the specific blocker, recorded on the ticket. Prose notes and orphan TODOs are debt.

**Evidence.** The art-bible gate surfaced five findings and then three residues; every one
was a two-line edit. Fixing them took less time than writing tickets would have. By
contrast, the genuine follow-up (#30, bible↔tokens parity) needs a script plus CI wiring —
real work, so a ticket was correct. The distinction is complexity, not convenience.

**How to apply.** Ask "can I finish this correctly right now without changing what this
change is about?" Yes → do it and mention it. No → write the blocker into the ticket body.
Never leave the finding in prose.
