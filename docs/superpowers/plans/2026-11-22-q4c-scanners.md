# Q4c — Two Additive Scanners Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gate two defects no current gate can see — a Markdown link or backticked repo path pointing at a file that no longer exists, and a plan that calls a merged PR "in review" — without touching a single existing gate.

**Architecture:** Two stand-alone Node ESM CLIs beside `scripts/table-integrity.mjs`, each with the same contract (`--root`, `--json`, exit 0 clean / 1 violations / 2 usage), each declared in `.github/gates.json` and run by `ci.yml` as a bare `run: npm run <script>` step. Vitest proves each in both directions: a seeded fixture must fail with `file:line`, and this repository must be clean. Both are additive: no existing gate is removed, renamed, reordered or relaxed, and `scripts/ci-gates.mjs` (the ratchet) stays untouched.

**Tech Stack:** Node 26 (ESM, `node:fs` only), Vitest 5.1.1 (`canon` project), npm 11, GitHub CLI for the merge cross-check.

**Spec:** issue #61; `.github/gates.json`; `scripts/ci-gates.mjs` (the manifest's contract); `tests/canon/table-integrity.test.mjs` (the fixture-and-spawn pattern this follows).

**Closes:** #61. **Depends on:** #45 (merged, `dd5f7b7`) for the manifest discipline.

## Global Constraints

- Node 26 / npm 11 only; no new dependency — `node:fs`, `node:path`, `node:child_process` are enough.
- Additive: `gates.json` gains entries, `ci.yml` gains steps. No gate is deleted, renamed or loosened; a gate count only goes up.
- Canon: **Die Sammlung**, **gesammelt**, **Der Abfahrtsaal**, four cards per pack, no water content, at most one `!` per surface and never in an error message or an `aria` string (`scripts/canon-check.mjs`).
- A gate is proven by a seeded failure, never by a green run alone (`docs/build/b0-b1-verification.md` §Q7).
- A gate that cannot run must say so and must not paint a pass: plan-status degrades to a **warning** without `gh` or a network, and never to a silent success.
- Paths are compared **case-sensitively** on every platform, so a link that resolves on Windows cannot pass here and break on `ubuntu-latest` (the class of PR #72).
- `npm run verify` green at the end; every commit names #61.

## Review Focus

- **Template and glob backticks** — the plans are full of `docs/superpowers/plans/YYYY-MM-DD-<slug>.md`, `src/**/*.css`, `tests/unit/[system]/` and `docs/adr/ADR-0001…0011`. A scanner that treats those as literal paths is red on the commit that adds it. Test: `paths-clean` fixture carries one of each.
- **Prose that merely contains "review"** — the delivery plan says "PR #2 produced two moving review heads". A claim parser that matches a bare `review` turns a correct sentence red. Test: `plan-status-clean` carries that exact sentence.
- **A relative link inside a fenced block** — the plans show the failing form as an example; it must not be scanned. Test: `paths-seeded` carries the broken link both live and fenced.
- **Case-only differences** — `docs/ADR-0002.md` where the file is `docs/adr/ADR-0002-styling-system.md` exists on Windows and not on Linux. Test: `paths-seeded` carries one.
- **Anchors and line suffixes** — `[x](doc.md#section)`, `docs/test-plan.md` §8 and a backticked `scripts/ci-gates.mjs:53` all point at things that exist; the fragment must be stripped, not resolved. Test: `paths-clean`.
- **No `gh`, no network** — CI has `permissions: contents: read` and no `GH_TOKEN`, so the merge cross-check cannot reach the API there. Test: a bogus `--gh` path exits 0 with a warning naming the reason.

---

### Task 1: `check:paths` — dead internal links and backticked repo paths

**Files:**
- Create: `scripts/check-paths.mjs`
- Create: `tests/canon/check-paths.test.mjs`
- Create: `tests/canon/fixtures/paths-seeded/broken.md`
- Create: `tests/canon/fixtures/paths-seeded/docs/exists.md`
- Create: `tests/canon/fixtures/paths-clean/good.md`
- Create: `tests/canon/fixtures/paths-clean/docs/exists.md`
- Create: `tests/canon/fixtures/paths-clean/docs/with space.md`
- Create: `tests/canon/fixtures/paths-clean/legacy/archived.md`
- Modify: `package.json` (add `check:paths`)

**Interfaces:**
- Produces: `node scripts/check-paths.mjs [--root <dir>] [--json]` → exit 0 clean, 1 violations, 2 usage; `--json` prints `{ status, files, links, violations: [{ file, line, target, kind }] }` where `kind` is `"link" | "path"` and `file` is relative to the repo root with forward slashes.
- Produces: the npm script `check:paths`.

- [ ] **Step 1: Write the seeded fixtures**

`tests/canon/fixtures/paths-seeded/broken.md` — every line below is a required case, in order, so the assertion can pin line numbers:

```markdown
# Seeded broken targets

Live link to a file that is gone: [the action plan](docs/action-plan.md).

A backticked path that is gone: `docs/action-plan.md`.

Case-only difference: `docs/EXISTS.md` (the file is `docs/exists.md`).

A directory that exists, treated as a link: [docs](docs/).

Wrong case in a relative link: [exists](Docs/exists.md).

```
[fenced example, not a link](docs/gone-too.md)
`design/never-there.md`
```
```

`tests/canon/fixtures/paths-seeded/docs/exists.md` and `tests/canon/fixtures/paths-clean/docs/exists.md`: one line each, `# Exists\n`.

`tests/canon/fixtures/paths-clean/good.md` — one case per Review Focus line:

```markdown
# Clean targets

Relative link with an anchor: [test plan](docs/exists.md#section).

Backticked file with a line suffix: `docs/exists.md:12`.

Backticked directory: `docs/`.

Link with a space in the target: [spaced](docs/with%20space.md).

Template backtick: `docs/plans/YYYY-MM-DD-<slug>.md`.

Glob backtick: `src/**/*.css`.

Template directory: `tests/unit/[system]/`.

Truncated list: `docs/adr/ADR-0001…0011`.

Outbound links: [upstream](https://example.org/x) · [mail](mailto:a@example.org) · [anchor](#clean-targets).
```

`tests/canon/fixtures/paths-clean/docs/with space.md`: `# Space\n`.
`tests/canon/fixtures/paths-clean/legacy/archived.md`: `[dead](gone.md)\n` — must be ignored because the segment is `legacy`.

- [ ] **Step 2: Write the failing tests**

`tests/canon/check-paths.test.mjs`, following `tests/canon/table-integrity.test.mjs`'s spawn shape (CLI exit code is the contract):

```js
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../..");
const script = join(repoRoot, "scripts/check-paths.mjs");

function run(argv) { /* spawnSync(process.execPath, [script, ...argv], { cwd: repoRoot, encoding: "utf8" }) */ }
function fixture(name) { /* run(["--json", "--root", join(here, "fixtures", name)]) → { code, report } */ }

describe("check-paths: seeded failure", () => {
  it("names every dead target with its file and line", () => {
    const { code, report } = fixture("paths-seeded");
    expect(code).toBe(1);
    expect(report.status).toBe("violations");
    expect(report.violations).toEqual([
      { file: "tests/canon/fixtures/paths-seeded/broken.md", line: 3, target: "docs/action-plan.md", kind: "link" },
      { file: "tests/canon/fixtures/paths-seeded/broken.md", line: 5, target: "docs/action-plan.md", kind: "path" },
      { file: "tests/canon/fixtures/paths-seeded/broken.md", line: 7, target: "docs/EXISTS.md", kind: "path" },
      { file: "tests/canon/fixtures/paths-seeded/broken.md", line: 11, target: "Docs/exists.md", kind: "link" },
    ]);
  });

  it("prints file:line to stderr and does not report the fenced example", () => {
    const { code, stderr } = run(["--root", join(here, "fixtures", "paths-seeded")]);
    expect(code).toBe(1);
    expect(stderr).toContain("broken.md:3: link docs/action-plan.md does not exist");
    expect(stderr).not.toContain("gone-too.md");
    expect(stderr).not.toContain("design/never-there.md");
  });
});

describe("check-paths: what it must not flag", () => {
  it("accepts anchors, line suffixes, directories, templates, globs and legacy", () => {
    const { code, report } = fixture("paths-clean");
    expect(code).toBe(0);
    expect(report.violations).toEqual([]);
  });

  it("exits 2 on a root that does not exist", () => {
    const { code, stderr } = run(["--root", join(here, "fixtures", "no-such-root")]);
    expect(code).toBe(2);
    expect(stderr).toContain("root does not exist");
  });
});

describe("check-paths: this repository", () => {
  it("has no dead internal link in a tracked Markdown file", () => {
    const { code, report } = run(["--json"]);
    expect(code).toBe(0);
    expect(report.files).toBeGreaterThan(10);
  });
});
```

- [ ] **Step 3: Run the tests and watch them fail**

Run: `npx vitest run --project canon tests/canon/check-paths.test.mjs`
Expected: FAIL — the spawned script does not exist, so `code` is `null`/`1` and `report` is `null`; the first assertion that fails is `expect(code).toBe(1)`.

- [ ] **Step 4: Implement `scripts/check-paths.mjs`**

Behaviour, in this order:

1. Files: `git ls-files -z -- '*.md'` from the repo root, filtered to drop any path with a `legacy` segment; when `git` is unavailable (spawn error or non-zero exit) fall back to a directory walk that skips `node_modules`, `.git`, `dist`, `styled-system`, `reports`, `coverage`, `test-results` and any `legacy` directory. Sort.
2. Per file, skip fenced blocks (``` / ~~~), then collect two families:
   - **links** — `[text](target)` and `![alt](target)`, plus inline `<a href="…">` / `<img src="…">`; drop a leading `<`, drop a trailing title, decode `%20`, strip `#fragment` and `?query`; skip empty, `//`, a URI scheme (`^[a-z][a-z0-9+.-]*:`), a leading `/` and a bare `#anchor`.
   - **paths** — backticked spans matching `^(docs|design|src|scripts|tests|public|photos|assets|\.github)\//`; skip a span containing a template or glob character (`*`, `?`, `{`, `}`, `[`, `]`, `<`, `>`, `…`, `|`, `$`); strip a `:digits` line suffix and a `#fragment`.
3. Resolve a link against `dirname(file)` and a path against the repo root; then resolve **segment by segment with `readdirSync`** so the comparison is case-exact on Windows too. A trailing `/` or a resolved directory is a pass.
4. Report `{ file, line, target, kind }`; stderr line `<file>:<line>: <kind> <target> does not exist`; exit 1 with a summary `check-paths: N dead target(s) in M files — fix the link or the backtick; never leave a path that only resolves on the author's machine.`; exit 2 for a missing `--root`; print `check-paths: clean (N targets in M files)` on success.

- [ ] **Step 5: Run the tests and watch them pass**

Run: `npx vitest run --project canon tests/canon/check-paths.test.mjs`
Expected: PASS (7 tests). If the repository case fails, fix the dead links it names — they are the defect the gate exists for — and list each fix in the PR body.

- [ ] **Step 6: Register the script and commit**

`package.json`: `"check:paths": "node scripts/check-paths.mjs"`. Commit `test(#61)` + `feat(#61)` in one checkpoint:

```bash
git add scripts/check-paths.mjs tests/canon/check-paths.test.mjs tests/canon/fixtures/paths-seeded tests/canon/fixtures/paths-clean package.json
git commit -m "feat(#61): check:paths gate for dead internal links and backticked paths"
```

---

### Task 2: plan-status — a plan may not call a merged PR "in review"

**Files:**
- Create: `scripts/plan-status.mjs`
- Create: `tests/canon/plan-status.test.mjs`
- Create: `tests/canon/fixtures/plan-status-seeded/plan.md`
- Create: `tests/canon/fixtures/plan-status-clean/plan.md`
- Create: `tests/canon/fixtures/plan-status-prs.json`
- Modify: `package.json` (add `gate:plan-status`)

**Interfaces:**
- Produces: `node scripts/plan-status.mjs [--root <dir>] [--prs <json>] [--gh <path>] [--json]` → exit 0 clean **or** degraded, 1 mismatch, 2 usage; `--json` prints `{ status: "clean" | "mismatch" | "skipped", reason?, prs: n, mentions: n, violations: [{ file, line, pr, claim }] }`.
- Produces: the npm script `gate:plan-status`.
- Consumes: `gh pr list --state merged --json number,mergedAt --limit 500`, or the `--prs` fixture (`{ "merged": [59, 64], "open": [61] }`), which is how the tests keep the network out of the gate.

- [ ] **Step 1: Write the fixtures**

`tests/canon/fixtures/plan-status-prs.json`:

```json
{ "merged": [59, 64], "open": [61] }
```

`tests/canon/fixtures/plan-status-seeded/plan.md` — one violation of each direction plus two decoys that must stay quiet:

```markdown
# Seeded plan

| Ticket | Status |
| --- | --- |
| Q4b | PR #59 in review |
| Q4c | PR #61 merged |
| Q4a | PR #64 ✅ |
| #45 | PR #59 produced two moving review heads and a review of a stale commit |
```

Violations: line 5 (`59` says in review, merged) and line 6 (`61` says merged, open). Line 7 is consistent; line 8 is prose.

`tests/canon/fixtures/plan-status-clean/plan.md`:

```markdown
# Clean plan

| Ticket | Status |
| --- | --- |
| Q4b | PR #59 merged |
| Q4c | PR #61 in review |

PR #2 produced two moving review heads and a review of a stale commit; PR #59 landed the ratchet.
```

- [ ] **Step 2: Write the failing tests**

`tests/canon/plan-status.test.mjs`: same spawn shape as Task 1.

- seeded: `run(["--json", "--prs", <fixture>, "--root", <plan-status-seeded>])` → `code` 1, `report.status` `"mismatch"`, `report.violations` equal to `[{ file, line: 5, pr: 59, claim: "review" }, { file, line: 6, pr: 61, claim: "merged" }]`.
- clean: same flags with `plan-status-clean` → `code` 0, `status` `"clean"`, and `report.mentions` is `6` (two table rows, one prose line with two `PR #` mentions, one more in the same line — pin the count the implementation prints).
- degrade: `run(["--json", "--root", <plan-status-seeded>, "--gh", join(here, "no-such-gh")])` → `code` 0, `report.status` `"skipped"`, `report.reason` contains `gh`, and stderr contains `plan-status: WARNING`.
- this repository: `run(["--prs", <fixture>])` over the real `docs/superpowers/plans/` → `code` 0.

- [ ] **Step 3: Run the tests and watch them fail**

Run: `npx vitest run --project canon tests/canon/plan-status.test.mjs`
Expected: FAIL — `scripts/plan-status.mjs` does not exist.

- [ ] **Step 4: Implement `scripts/plan-status.mjs`**

1. Plans: every `*.md` directly under `--root` (default `docs/superpowers/plans`), sorted.
2. Merge set: `--prs` JSON if given, else `gh pr list --state merged --json number,mergedAt --limit 500` with `spawnSync` and a 15 s timeout; on a missing binary, a non-zero exit or unparseable output, print `plan-status: WARNING — could not read merged PRs (<reason>); the plan claims are unverified` and exit 0 with `status: "skipped"`.
3. Claims: per line, `/PR #(\d+)/g`, then a status token in the **same clause after the mention**, stopping at `|`, `.`, `;` or end of line: `in review`, `in-review`, `awaiting review`, `review pending`, `🟡`, `⬜`, `open` → claim `"review"`; `merged`, `landed`, `✅`, `done` → claim `"merged"`. A mention with no status token in its clause is prose and is not a claim.
4. Mismatch: claim `review` for a PR in the merged set, or claim `merged` for a PR in the open set. Print `plan.md:5: PR #59 is merged but the plan says "in review"`, exit 1.
5. `--json` prints the object above; the last line is `plan-status: clean (N claims in M plans, K merged PRs)`.

- [ ] **Step 5: Run the tests and watch them pass**

Run: `npx vitest run --project canon tests/canon/plan-status.test.mjs`
Expected: PASS. The real-tree case proves the current plan does not contradict the merged log; if it does, the plan's row is the defect — fix the row, not the gate.

- [ ] **Step 6: Register and commit**

`package.json`: `"gate:plan-status": "node scripts/plan-status.mjs"`. Commit:

```bash
git add scripts/plan-status.mjs tests/canon/plan-status.test.mjs tests/canon/fixtures/plan-status-seeded tests/canon/fixtures/plan-status-clean tests/canon/fixtures/plan-status-prs.json package.json
git commit -m "feat(#61): plan-status gate against the merged-PR log"
```

---

### Task 3: Wire both gates additively and prove the chain

**Files:**
- Modify: `.github/gates.json` (two new enforced entries, nothing else)
- Modify: `.github/workflows/ci.yml` (two new bare steps)
- Modify: `tests/README.md` (gate order + commands)
- Test: `tests/unit/ci-gates.test.ts` is **not** edited — the manifest check proves the wiring.

- [ ] **Step 1: Declare both gates**

In `.github/gates.json`, after `table-integrity`: `{ "id": "internal-paths", "script": "check:paths" }` and `{ "id": "plan-status", "script": "gate:plan-status" }`. Nothing removed, nothing reordered, `pending` untouched.

- [ ] **Step 2: Run the manifest check before ci.yml is edited — watch it fail closed**

Run: `npm run ci:gates`
Expected: FAIL with `enforced gate "internal-paths": ci.yml has no bare "run: npm run check:paths" step` and the same for `plan-status`. This is #45's ratchet doing its job; paste it in the PR body.

- [ ] **Step 3: Add the two steps to `ci.yml`**

After `- name: Markdown table integrity`:

```yaml
      - name: Internal paths (links and backticked repo paths)
        run: npm run check:paths

      - name: Plan status vs. merged PRs
        run: npm run gate:plan-status
```

- [ ] **Step 4: Prove the chain end to end**

Run: `npm run ci:gates` → `16 enforced (…, internal-paths, plan-status) · pending: e2e (#24), axe (#24), budget (#25), pwa (#19)`.
Run: `npm run verify` → `verify: 16 gates green in <n>s`.
Run: `gh auth status` — the token carries `gist, read:org, repo` and **not `workflow`**, so step 3 cannot be pushed by this session. The `ci.yml` hunk is committed locally and the push is attempted once to capture the real rejection; the branch is then pushed at the pre-`ci.yml` commit and the PR body names the blocker with `gh auth refresh -s workflow`. The ticket's AC #5 says "15 gates"; both checks are declared because an undeclared check is invisible to the ratchet — the PR states the one-gate difference and why.

- [ ] **Step 5: Commit**

```bash
git add .github/gates.json .github/workflows/ci.yml tests/README.md
git commit -m "chore(#61): wire check:paths and plan-status into the gate chain"
```

---

## Self-review

- **Spec coverage:** #61 §1 → Task 1 (links, backticked paths, `file:line`, fences, `legacy/`, seeded fixture, real tree). §2 → Task 2 (`grep -Eo 'PR #[0-9]+'`, merged cross-check, fail-or-warn, degrade without `gh`). AC 1 → Task 3. AC 2 → Task 1 Step 5. AC 3 → Task 2 + Task 3. AC 4 → Task 2 Step 3. AC 5 → Task 3 Step 4.
- **Type consistency:** both CLIs share `--root`, `--json`, the `status` field and the 0/1/2 exit codes; `check-paths` uses `kind`, `plan-status` uses `claim`.
- **Review Focus:** each line names the fixture that pins it. Nothing is left to "handle edge cases".
