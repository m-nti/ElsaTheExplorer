# Plans

Committed implementation plans, written with the `writing-plans` skill and executed with
`subagent-driven-development`. One file per ticket cluster.

**Name:** `YYYY-MM-DD-<slug>.md` (slug = the branch or ticket cluster, e.g.
`2026-11-22-b2-cardface.md`).

**Lifecycle**

1. `brainstorming` settles the goal and constraints.
2. `writing-plans` writes the file below; it is committed on the ticket's branch.
3. `subagent-driven-development` runs it. The per-plan ledger lives in the git-ignored
   `.superpowers/sdd/<slug>/progress.md` — never here.
4. The final review passes, the ledger is deleted, the plan stays as the record.

**Required header** (verbatim from `writing-plans`)

```markdown
# <Feature> Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** [one sentence: what this builds]
**Architecture:** [2–3 sentences on the approach]
**Tech Stack:** [key technologies/libraries with versions]
**Spec:** [path to the spec/design doc this plan implements — it travels with the plan]

## Global Constraints
- stack, budgets, canon rules, a11y tier that every task must honour

## Review Focus
- the five failure modes the spec implies but no task test covers, most likely first,
  each with the test that pins it in the task that owns the code
```

**Task shape**

Each task is independently testable and names, in this order: the file(s) with exact
paths, the interface/signature it introduces, the failing test that proves it (path +
assertion), the command that runs that test, and the commit message. A task that cannot
name its failing test is a design task — give it a gate or a named reviewer instead.
