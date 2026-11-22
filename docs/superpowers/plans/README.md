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

**Required header**

```markdown
# <Feature> — implementation plan

> **Ticket:** Closes #N · **Branch:** feat/<slug> · **Base:** <sha>
> **Spec:** <path> (§…) · **Status:** draft | executing | done

## Global Constraints
- stack, budgets, canon rules, a11y tier that every task must honour

## Review Focus
- what the reviewers must check beyond "tests pass"
```

**Task shape**

Each task is independently testable and names, in this order: the file(s) with exact
paths, the interface/signature it introduces, the failing test that proves it (path +
assertion), the command that runs that test, and the commit message. A task that cannot
name its failing test is a design task — give it a gate or a named reviewer instead.
