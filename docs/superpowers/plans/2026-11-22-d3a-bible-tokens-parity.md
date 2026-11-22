# Art Bible ↔ Token Parity Gate (D3a) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A fail-closed CI gate that proves every colour value declared in `design/art/art-bible.md` equals the value carried by `design/tokens/tokens.ts`.

**Architecture:** One dependency-free Node ESM script (`scripts/bible-tokens-parity.mjs`) reads two declaration shapes out of the bible — palette table rows and inline `--token #value` spans — and the `palette` object literal out of `tokens.ts`. A Vitest canon self-test pins the parser to the real typed module, seeds both directions of divergence in temporary copies, and asserts the CLI exit code.

**Tech Stack:** Node 26 ESM (no new dependency), Vitest 5.1.1 (`canon` project), GitHub Actions, `.github/gates.json`.

**Spec:** #30 · `design/art/art-bible.md` §4/§7/§8 · `design/tokens/tokens.ts` · `docs/adr/ADR-0002-styling-system.md` · `Closes #30`

**Branch:** `feat/d3a-bible-tokens-parity` · **Base:** `6b9c50a` · **Studio owner:** `technical-artist` (+ `ui-programmer`) · **Cross-check:** `cs-frontend-engineer`

## Global Constraints

- Panda tokens in `design/tokens/` are the single numeric authority (ADR-0002); the bible is a document, so a bible value that disagrees with a token is the defect this gate names.
- CI is fail-closed via `.github/gates.json`: a gate needs an `npm run <script>` entry, a `ci.yml` step, and no `--if-present` / `|| true` (`scripts/ci-gates.mjs`).
- Canon: **Die Sammlung / The Collection**, **four** cards per pack, **Der Abfahrtsaal**, the progress verb **gesammelt / collected**, no water vocabulary, no retired booklet noun for the collection, at most one `!` per surface.
- Every numeric example in a plan or doc must be a value the code actually holds; a stale example is the failure mode this ticket exists to close.
- No new dependency; no runtime code; the gate runs in seconds.

## Review Focus

- **A retired value quoted inside a role cell** — the `--quiet` row's role text names the old `#756e7d` to explain the raising. The parser must read column 1 and column 2 only, so the explanation never becomes the declaration. (This is the exact text that filed the ticket.)
- **A declaration deleted, not fixed** — removing a palette row must fail as `undeclared`, never pass because there is nothing left to compare.
- **A name the palette does not hold** — e.g. `--star-color`, which is a bible concept and not a `tokens.ts` key. It must fail as `unknown-token` rather than be skipped.
- **Non-hex values** — hairline tokens are `rgb(… / 14%)`; the comparison must not silently treat them as absent or as hex.
- **Duplicate declarations** — §2 restates `--accent`/`--metal` inline and §7 restates `--quiet`; two declarations of one token must agree with each other as well as with the palette.

---

### Task 1: The checker, its CLI, and the seeded canon tests

**Files:**
- Create: `scripts/bible-tokens-parity.mjs`
- Test: `tests/canon/bible-tokens-parity.test.mjs`

**Interfaces:**
- Produces (named exports, imported by the test):
  - `parsePalette(source: string): Map<string, { value: string, line: number }>` — kebab-case key → raw value, parsed from the `export const palette = { … } as const` block.
  - `parseBible(source: string): Declaration[]` where `Declaration = { token: string, value: string, line: number, shape: "row" | "inline" }`; `token` and `value` are lowercase.
  - `checkParity({ bibleSource: string, tokensSource: string }): ParityReport` where
    `ParityReport = { status: "clean" | "drift", checked: number, missing: string[], violations: { token: string, line: number, problem: "drift" | "unknown-token" | "conflict" | "undeclared", bibleValue?: string, tokenValue?: string }[] }`.
  - `REQUIRED_TOKENS: readonly string[]` — the coverage floor (kebab names).
- CLI: `node scripts/bible-tokens-parity.mjs [--bible <file>] [--tokens <file>] [--json]`; exit `0` clean, `1` drift/undeclared/unknown/conflict, `2` usage error (missing file).

- [ ] **Step 1: Write the failing test**

```js
// tests/canon/bible-tokens-parity.test.mjs
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("seeded divergence", () => {
  it("fails when the bible still quotes the retired --quiet value", () => {
    const { code, report } = seed({ "#978fa0": "#756e7d" });
    expect(code).toBe(1);
    expect(report.violations).toContainEqual(
      expect.objectContaining({ token: "quiet", problem: "drift", bibleValue: "#756e7d", tokenValue: "#978fa0" }),
    );
  });

  it("fails when the token moved and the bible did not", () => {
    const { code, report } = seed({ "#978fa0": "#9a929f" }); // bible untouched, token copy changed
    expect(code).toBe(1);
    expect(report.violations).toContainEqual(expect.objectContaining({ token: "quiet", problem: "drift" }));
  });

  it("fails when a required declaration is deleted", () => {
    const { code, report } = seed({}, (bible) => bible.replace(/^\| `#978fa0` \| `--quiet`.*$/m, ""));
    expect(code).toBe(1);
    expect(report.missing).toContain("quiet");
  });

  it("fails on a token name the palette does not hold", () => {
    const { code, report } = seed({}, (bible) => `${bible}\n\n| \`#ead7b7\` | \`--star-color\` | x |\n`);
    expect(code).toBe(1);
    expect(report.violations).toContainEqual(expect.objectContaining({ token: "star-color", problem: "unknown-token" }));
  });

  it("fails when two declarations of one token disagree", () => {
    const { code, report } = seed({}, (bible) => `${bible}\n\n\`--quiet #9a929f\`\n`);
    expect(code).toBe(1);
    expect(report.violations).toContainEqual(expect.objectContaining({ token: "quiet", problem: "conflict" }));
  });

  it("does not read a retired value quoted inside the role cell", () => {
    const { report } = seed({});
    expect(report.violations.some((v) => v.token === "quiet" && v.problem === "drift")).toBe(false);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run --project canon tests/canon/bible-tokens-parity.test.mjs`
Expected: FAIL — `Failed to resolve import "../../scripts/bible-tokens-parity.mjs"` / `seed is not defined`.

- [ ] **Step 3: Implement `scripts/bible-tokens-parity.mjs`**

Rules: a row declares only when column 1 is all hex values and column 2 is all backticked `--token` names, equal in count and paired by position; an inline span declares when one backtick span holds `--token #value`; hex comparison is case-insensitive; `REQUIRED_TOKENS` covers the building surfaces, `ink`, `muted`, `quiet`, `metal`, `metal-dark`, `accent`, `accent-bright` and every `print-*` palette token. Guard the CLI behind an entry-point check so the test can import the module without running it.

- [ ] **Step 4: Run the tests until they pass**

Run: `npx vitest run --project canon tests/canon/bible-tokens-parity.test.mjs`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/bible-tokens-parity.mjs tests/canon/bible-tokens-parity.test.mjs
git commit -m "feat(gate): art bible <-> token parity checker (#30)"
```

---

### Task 2: Make the bible declare the print palette, and gate the repository

**Files:**
- Modify: `design/art/art-bible.md` §4 (print colours prose → table), §7 (credit quote names its token)
- Test: `tests/canon/bible-tokens-parity.test.mjs` (add the repository case)

**Interfaces:**
- Consumes: `checkParity`, `parsePalette`, `REQUIRED_TOKENS` from Task 1.

- [ ] **Step 1: Write the failing repository test**

```js
describe("this repository", () => {
  it("declares every required token and every declaration agrees with tokens.ts", () => {
    const { code, report } = run([]);
    expect(code).toBe(0);
    expect(report.status).toBe("clean");
    expect(report.missing).toEqual([]);
    expect(report.checked).toBeGreaterThanOrEqual(REQUIRED_TOKENS.length);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run --project canon tests/canon/bible-tokens-parity.test.mjs`
Expected: FAIL — `report.missing` contains the `print-*` tokens the bible only names as prose labels.

- [ ] **Step 3: Replace §4's print-colours prose with a `| Value | Token |` table**

Thirteen rows already in the prose (`print-name` … `print-kind`) plus `print-paper` and `print-ink`; keep the measured-contrast sentence and the credit note verbatim below the table. In §7, write the credit row's value as `` `--print-credit #9a8da0` `` so the restatement is machine-checked.

- [ ] **Step 4: Run the tests until they pass**

Run: `npx vitest run --project canon tests/canon/bible-tokens-parity.test.mjs`
Expected: PASS (7 tests). Also run `npm run gate:tables` — the new table must be rectangular.

- [ ] **Step 5: Commit**

```bash
git add design/art/art-bible.md tests/canon/bible-tokens-parity.test.mjs
git commit -m "docs(art): art bible declares the print palette as rows (#30)"
```

---

### Task 3: Wire the gate into the enforced chain

**Files:**
- Modify: `package.json` (script `gate:parity`)
- Modify: `.github/gates.json` (enforced entry after `table-integrity`)
- Modify: `.github/workflows/ci.yml` (step after `Markdown table integrity`)
- Modify: `docs/test-plan.md` §8.3 and §9 (gate count and list)

**Interfaces:**
- Consumes: the CLI from Task 1.

- [ ] **Step 1: Add the script, the manifest entry and the CI step**

`"gate:parity": "node scripts/bible-tokens-parity.mjs"`; `{ "id": "bible-tokens-parity", "script": "gate:parity" }`; a `- name: Art bible <-> token parity` step. Update test-plan's "thirteen today" list to the new count and name the gate.

- [ ] **Step 2: Prove the wiring agrees three ways**

Run: `npm run ci:gates`
Expected: the enforced count rises by one and the list names `bible-tokens-parity`. The count is not written here: it moves as the project adds gates, and the manifest prints it.

- [ ] **Step 3: Prove the gate fails on a real seeded divergence through the npm entry point**

Run: `node -e "…"` is not the proof — copy the bible to a temporary file, swap one value, and run the gate with `--bible`; expect exit 1 and the token named. Restore and expect exit 0.

- [ ] **Step 4: Run the whole chain**

Run: `npm run verify`
Expected: green for this scope; any pre-existing red is named in the PR, not hidden.

- [ ] **Step 5: Commit**

```bash
git add package.json .github/gates.json .github/workflows/ci.yml docs/test-plan.md
git commit -m "ci(gate): enforce art bible <-> token parity (#30)"
```

---

## Delivery note (2026-11-22)

Task 3 is authored but **not pushed** from the implementing session: the branch's
token is an OAuth app token with scopes `gist, read:org, repo` and no `workflow`, so
Git refuses any commit that touches `.github/workflows/ci.yml` (`refusing to allow an
OAuth App to create or update workflow`) and the Contents API answers 404 for the same
write. `scripts/ci-gates.mjs` requires a bare `run: npm run gate:parity` step in
`ci.yml` — verified on `33c5c90`, where the check also rejects `npm run <g> | tee` and
`continue-on-error` — so the gate cannot be declared enforced in `gates.json` alone.

What that means for the pushed branch: `scripts/bible-tokens-parity.mjs`, the canon
self-tests and the bible's declaration table are landed, and the *rule* is already
enforced in CI through `canon-self-test`, whose repository case fails on drift. The
named, early-running `gate:parity` step is the piece waiting on the scope.

Owner action, one command and one push:

```
gh auth refresh -s workflow
git push origin feat/d3a-bible-tokens-parity
```
