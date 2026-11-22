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
