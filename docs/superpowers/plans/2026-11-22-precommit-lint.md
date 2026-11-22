# Pre-commit lint hook — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make a staged lint error impossible to commit, without putting the full gate set in
`pre-commit`.

**Architecture:** `.githooks/pre-commit` reads the staged path list from the index, keeps the
staged `.js/.mjs/.cjs/.ts/.svelte` files, and runs the repo's own ESLint on exactly those paths.
No build, no typecheck, no autofix. An empty lintable stage exits before ESLint is resolved,
so a docs-only commit costs one `git diff`. `npm run prepare` already points git at `.githooks`
(`scripts/git-hooks.mjs`), so the hook ships installed; `pre-push` keeps the full
`npm run verify` gate set.

**Tech Stack:** POSIX `sh` (Git for Windows' own shell on the owner's host), Git 2.x, ESLint
10.15.0 via `node_modules/eslint/bin/eslint.js`, Vitest 5.1.1.

**Spec:** #103, `eslint.config.js` (`@typescript-eslint/no-unused-vars` = error),
`AGENTS.md` (lint before commit; CI is a backstop), `docs/superpowers/plans/2026-11-22-v2-delivery.md` §0.

## Global Constraints

- Staged files only: `.js`, `.mjs`, `.cjs`, `.ts`, `.svelte`. No build, no typecheck, no autofix.
- Any ESLint error blocks the commit and the output names `file:line`. Warnings do not block
  (`no-console` stays a warning).
- Nothing lintable staged → exit 0 with no ESLint process started.
- `npm run prepare` keeps `core.hooksPath .githooks`; the hook is documented for the reader
  of `README.md`.
- No `eslint-disable`, no rule severity change, no new dependency.
- Canon: no water content, no retired binder nouns, at most one `!` per surface, the sixth
  room is Der Abfahrtsaal. This change touches none of that copy.
- No force-push, no history rewrite, no deploy, no merge in this workstream.

## Review Focus

- **A path with a space survives the argv.** The staged list is split on newline only, with
  globbing disabled, so `assets/img/mein hund.png`-class names arrive as one argument.
- **A partially staged file is linted as it stands on disk.** ESLint reads the working tree,
  not the index; `pre-push`'s clean-tree check is what keeps the pushed tree the verified tree.
  The hook comment must say so instead of implying index-blob linting.
- **The hook cannot pass by accident.** Missing `node_modules` or missing `node` exits 1 with
  the reason; an ESLint that cannot run is a blocked commit, never a silent pass.
- **Selection is by extension, not by directory.** A staged `.css` or `.md` is not linted; a
  staged `.ts` inside `tests/canon/fixtures/**` is handed to ESLint and ignored by the config.
- **The test proves the real rule, not a stub.** The reject case seeds an unused import and
  runs the repository's own `eslint.config.js`; the stub is used only to prove which paths
  the hook passes through.

---

### Task 1: Shared git fixtures for hook tests

**Files:**
- Create: `tests/unit/support/git-fixture.ts`
- Modify: `tests/unit/pre-push-refs.test.ts:1-96`
- Test: `tests/unit/pre-push-refs.test.ts` (unchanged assertions)

**Interfaces:**
- Produces: `gitEnv(): NodeJS.ProcessEnv`, `samePath(a: string, b: string): boolean`,
  `findPosixShell(): string | null`, `runGit(dir: string, args: string[]): GitOutput`,
  `makeRepo(prefix: string): { dir: string; git: (...args: string[]) => GitOutput }`.
- `GitOutput` is `{ status: number | null; stdout: string; stderr: string }`.

- [ ] **Step 1: Move the three host helpers out of the pre-push test, unchanged**

The bodies are moved verbatim (comments included) so the pre-push assertions keep their
meaning; only the imports change.

- [ ] **Step 2: Run the pre-push suite to verify the move is behaviour-neutral**

Run: `npx vitest run tests/unit/pre-push-refs.test.ts`
Expected: PASS — 7 passed (5 hook cases + 2 precondition cases).

- [ ] **Step 3: Commit**

```bash
git add tests/unit/support/git-fixture.ts tests/unit/pre-push-refs.test.ts
git commit -m "test(#103): share the git fixture between hook suites"
```

### Task 2: The hook's contract, as failing tests

**Files:**
- Create: `tests/unit/pre-commit-lint.test.ts`

**Interfaces:**
- Consumes: `makeRepo`, `runGit`, `findPosixShell`, `gitEnv` from Task 1.
- Produces: the behaviours Task 3 implements — staged extension set, blocking exit 1 with
  `file:line`, silent exit 0 on an empty lintable stage.

- [ ] **Step 1: Write the failing tests**

Five cases: a seeded unused import is rejected with the path and `line:col` (real
`eslint.config.js`, reached through a `node_modules` junction in the fixture); a clean staged
file passes; a stage holding only `.md`/`.css` exits 0 without starting ESLint; an unstaged
file with an unused variable does not block a clean staged file; a stub ESLint records its
argv and proves the four extensions are selected; `git ls-files -s .githooks/pre-commit`
reports mode `100755`.

- [ ] **Step 2: Run the suite to verify it fails for the right reason**

Run: `npx vitest run tests/unit/pre-commit-lint.test.ts`
Expected: FAIL — every case that runs the hook fails because `.githooks/pre-commit` does not
exist yet; the mode case fails with `undefined`.

- [ ] **Step 3: Commit the red tests**

```bash
git add tests/unit/pre-commit-lint.test.ts
git commit -m "test(#103): seed the pre-commit reject and accept paths"
```

### Task 3: The hook, and its documentation

**Files:**
- Create: `.githooks/pre-commit`
- Modify: `README.md` (Local workflow → hooks section)
- Modify: `docs/superpowers/plans/2026-11-22-v2-delivery.md` (Global Constraints, one line)

**Interfaces:**
- Produces: `.githooks/pre-commit`, POSIX `sh`, exit 0/1 as the tests assert.

- [ ] **Step 1: Write the hook**

Resolve the root with `git rev-parse --show-toplevel`, list the staged paths with
`git -c core.quotepath=false diff --cached --name-only --diff-filter=ACMR` over the five
pathspecs, exit 0 when the list is empty, then run
`node node_modules/eslint/bin/eslint.js --no-warn-ignored` on the list with newline-only
splitting and globbing disabled. Missing `node` or missing ESLint exits 1 with the reason.

- [ ] **Step 2: Run the suite to verify green**

Run: `npx vitest run tests/unit/pre-commit-lint.test.ts`
Expected: PASS, 6 passed.

- [ ] **Step 3: Make the file executable in the index**

Run: `git update-index --add --chmod=+x .githooks/pre-commit`
Expected: `git ls-files -s .githooks/pre-commit` starts with `100755`.

- [ ] **Step 4: Document it**

`README.md` gains a **Pre-commit hook** subsection under *Local workflow*: what it lints,
why it is narrow, what a bypass looks like and that `--no-verify` is not a documented path.
The delivery plan's Global Constraints gains: every commit runs `.githooks/pre-commit`
(staged lint only); every push runs `.githooks/pre-push`.

- [ ] **Step 5: Prove both paths on the real repository**

Seed an unused import in a scratch file, `git add` it, run the hook — expect exit 1 with
`file:line` and rule name. Remove it, stage a clean file — expect exit 0. Stage only a `.md`
change — expect exit 0 with no ESLint output. Paste all three in the PR.

- [ ] **Step 6: Run the full gate set**

Run: `npm run verify`
Expected: the fourteen enforced gates green, last line `verify: 14 gates green in …s.`

- [ ] **Step 7: Commit and push**

```bash
git add .githooks/pre-commit README.md docs/superpowers/plans/
git commit -m "feat(#103): lint the staged files before a commit"
```

## Self-Review

- **Spec coverage:** AC1 reject with file:line → Task 2 case 1. AC2 clean stage commits → case
  2. AC3 no-op stage passes → case 3. AC4 installed by `prepare` + documented → Task 3 steps 4
  and 6, plus the existing `toolchain.test.ts` case. AC5 test proves both paths, seeded first
  → Tasks 2 and 3 in that order.
- **Step scan:** every step names a command and the output that means it passed.
- **Type consistency:** `GitOutput` is the only new type and both suites consume it.
- **Review Focus:** each line has a test or a verification step above — the space case is
  covered by the newline-IFS test in Task 2 (a path with a space is one argv entry), the
  partially-staged case is documented in the hook comment, fail-closed is case 6.
- **Proportion:** three tasks, one shell file, two test files, two doc edits.
