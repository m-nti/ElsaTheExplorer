# D5d — Windows-host unit gate and a Windows CI job

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox
> (`- [ ]`) syntax for tracking.

**Goal:** Make the unit gate pass on a Windows checkout (`core.autocrlf=true`) without
weakening any assertion, and stage a `windows-latest` CI job that keeps the class of
host-only drift from returning.

**Architecture:** Three test files carry the failures, and each is a different root cause:
LF-only line splitting in the registry reader, two spellings of one fixture directory in
the pre-push fixture, and native path separators plus a symlink privilege the host may not
have. The fixes live in `tests/unit/` only; no product rule changes. The CI job is a
separate workflow commit, kept local while the token lacks the `workflow` scope.

**Tech Stack:** Vitest 5.1.1, Node 26, Git for Windows, GitHub Actions.

**Spec:** `docs/test-plan.md` §8 (gate order), `AGENTS.md` (test and CI cadence), issues
#65, #68, #69, #71.

## Global Constraints

- Canon vocabulary: no water content; no retired binder nouns; at most one `!` per
  surface; the sixth room is Der Abfahrtsaal.
- Tests only. `design/registry/entities.yaml` content, the photo-derivative rules and the
  `--check` contract are unchanged.
- POSIX assertions do not get weaker. A guarded skip must name its reason and must not
  fire on Linux CI.
- No force-push, no history rewrite, no deploy, no merge in this workstream.
- PR #72 already fixed the canon path comparison and the `npm` spawn in
  `scripts/verify.mjs`; this branch does not repeat it. The branch was fast-forwarded
  from 846de1c to 473a5f0 to pick that up, because a Windows `npm run verify` cannot pass
  without it.

## Review Focus

- **The registry reader still rejects real layout errors.** Splitting on `/\r?\n/` must
  not turn `"entities:"` plus a stray `\r` into a valid keyless scalar; the existing
  negative tests stay as they are.
- **The pre-push fixture stays hermetic.** A path comparison that ignores too much
  (for example comparing only basenames) would turn the guard into decoration; the new
  comparison must still reject a different directory.
- **The symlink skip is honest.** Linux CI must execute both symlink tests; only a
  host that refuses `symlinkSync` with EPERM or EACCES skips, and the reason is in the
  test title and the run output.
- **The Windows job adds, not weakens.** The ubuntu `verify` job keeps all fourteen
  enforced gates; the new job runs five of them on `windows-latest`.
- **A local commit is not an enforced gate.** #71 stays unpushed until the token can
  write `.github/workflows/`; the PR must say so instead of implying the gate is live.

---

### Task 1: Registry reader tolerates a CRLF checkout (#68)

**Files:**
- Modify: `tests/unit/registry.test.ts:178`
- Test: `tests/unit/registry.test.ts` (`the layout reader` block)

**Interfaces:**
- Consumes: `parseRegistry(source: string): ParsedRegistry`, `section()`, `field()`.
- Produces: nothing new; the reader keeps its signature and its error messages.

- [ ] **Step 1: Write the failing test**

```ts
it("accepts a CRLF checkout, as core.autocrlf=true produces", () => {
  const parsed = parseRegistry("entities:\r\n  - name: x\r\n    status: active\r\n");
  expect(section(parsed, "entities").map((entry) => entry.name)).toEqual(["x"]);
  expect(field(section(parsed, "entities")[0]!, "status")).toBe("active");
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/unit/registry.test.ts -t "CRLF"`
Expected: FAIL with `RegistryLayoutError: ... "entities:` (the parser sees `entities:\r`).

- [ ] **Step 3: Split on `/\r?\n/`**

In `parseRegistry`, replace `source.split("\n")` with `source.split(/\r?\n/)` and state
why (a Windows checkout is CRLF by design; `core.autocrlf=true` and no `.gitattributes`).

- [ ] **Step 4: Run it green**

Run: `npx vitest run tests/unit/registry.test.ts`
Expected: PASS, including every existing layout-rejection test.

- [ ] **Step 5: Commit** — folded into the #65/#68/#69 commit.

---

### Task 2: The pre-push fixture compares one canonical path (#69)

**Files:**
- Modify: `tests/unit/pre-push-refs.test.ts:30-49`
- Test: same file, new cases in `pre-push ref check`

**Interfaces:**
- Produces: `samePath(a: string, b: string): boolean` and `findPosixShell(): string | null`
  local to the test file. `run()` uses the resolved shell path instead of the bare `sh`.

- [ ] **Step 1: Add the regression tests**

- `repo()` must be hermetic under two spellings: assert `samePath(toplevel, dir)` for the
  native form, the forward-slash form, and (win32 only) the upper-case form, and assert
  `samePath(join(dir, ".."), dir)` is false so the guard still rejects a different tree.
- A capability test asserts `findPosixShell()` returns an executable path, or records the
  reason it does not. A missing shell skips the five hook tests with that reason in the
  title; it never skips on a host that has one.

- [ ] **Step 2: Run and watch the suite fail**

Run: `npx vitest run tests/unit/pre-push-refs.test.ts`
Expected: FAIL — `fixture repo is not hermetic: C:/Users/... !== C:\Users\HLLENM~1\...`.

- [ ] **Step 3: Canonicalise both sides**

`samePath` resolves both arguments with `realpathSync.native` and compares
case-insensitively only on win32. `findPosixShell` probes `sh`, `bash`, then the `sh.exe`
that ships beside the `git --exec-path` root (a PowerShell session does not export Git's
`bin` directory).

- [ ] **Step 4: Run green, then prove the test can fail**

Run: `npx vitest run tests/unit/pre-push-refs.test.ts` → PASS (5 passed).
Then temporarily revert `samePath` to `a === b`, run again → the new case fails; restore.

- [ ] **Step 5: Commit** — folded into the #65/#68/#69 commit.

---

### Task 3: Photo derivatives report POSIX paths and guard the symlink privilege (#69)

**Files:**
- Modify: `tests/unit/photo-derivatives.test.ts` (drift assertion, two symlink tests)
- Test: same file

**Interfaces:**
- Produces: `posix(text: string): string`, `probeSymlinkSupport()` and a
  `symlinkIt(title, fn, timeout)` wrapper local to the file.

- [ ] **Step 1: Write the failing expectations**

- The drift test asserts on `posix(check.stderr)`, so the human-readable report is
  compared as `detail/landscape.jpg` on every host.
- A capability test asserts the probe either creates a link or records a reason, so the
  guard itself is covered.

- [ ] **Step 2: Run and watch the failures**

Run: `npx vitest run tests/unit/photo-derivatives.test.ts`
Expected: 3 failed — the drift separator and two `EPERM: operation not permitted, symlink`.

- [ ] **Step 3: Normalise in the assertion, guard in the fixture**

`posix` replaces `\` with `/` (an identity on POSIX). The two symlink tests register
through `symlinkIt`; when the probe failed with EPERM or EACCES the title carries
`skipped: <code>` and the run prints the reason once. Any other probe error is rethrown,
because an unexplained failure must not become a skip.

- [ ] **Step 4: Run green on Windows**

Run: `npx vitest run tests/unit/photo-derivatives.test.ts`
Expected: PASS with 2 skipped and the reason named. On Linux the same file runs both
symlink tests (assert the skip count is 0 there when CI reports it).

- [ ] **Step 5: Commit** — folded into the #65/#68/#69 commit.

---

### Task 4: A `windows-latest` verify job (#71) — local commit only

**Files:**
- Modify: `.github/workflows/ci.yml` (add a `windows` job after `verify`)

**Interfaces:**
- Consumes: the published npm scripts `ci:gates`, `check:ts`, `check`, `test:unit`.
- Produces: job `verify-windows`, `runs-on: windows-latest`.

- [ ] **Step 1: Add the job, do not touch the ubuntu job**

Steps: checkout (pinned SHA, `persist-credentials: false`), setup-node 26 with npm cache,
`npm ci`, `npm run ci:gates`, Git's `bin` directory appended to `GITHUB_PATH` so the
POSIX hook script resolves, `npm run check:ts`, `npm run check`, `npm run test:unit`.

- [ ] **Step 2: Prove the gate manifest still holds**

Run: `npm run ci:gates`
Expected: `ci-gates: 14 enforced (...)`; the new step satisfies the bare-step rule and no
banned pattern is introduced.

- [ ] **Step 3: Commit locally, do not push**

The OAuth token has `repo` but not `workflow`; a push that touches `.github/workflows/`
is rejected. Keep the commit on the branch, report it, and name the unblock command.

- [ ] **Step 4: Declare the gate honestly**

The PR body says the Windows job is prepared and unpushed, and that making it a required
check needs a branch-protection change that this token cannot make.
