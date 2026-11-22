# Table gate: orphaned rows — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `scripts/table-integrity.mjs` fail on table-looking rows that prose has detached from their header, closing issue #75.

**Architecture:** The gate walks one Markdown file line by line and already knows where a table starts (pipe row followed by a delimiter row). It gains one piece of section state — "this section has shown a table" — and reports any later pipe row that does not itself start a table as an orphan. A heading resets the state; a blank line does not, because two tables separated by a blank line both have their own delimiter row and stay valid.

**Tech Stack:** Node 26 ESM, no dependencies added.

**Spec:** issue #75 (`.github` tracker), `docs/test-plan.md` gate 1b.

## Global Constraints

- Node 26 / npm 11; no new dependency.
- No allowlist and no ignore list in the gate: an exemption is how a table gate dies.
- `gate:tables` stays the single table gate in `.github/gates.json`; its self-test (`npm run test:canon`) is the only test surface changed.
- Canon: the forbidden-vocabulary list in `AGENTS.md` and `scripts/canon-allowlist.json` applies unchanged to every line added here; `Der Abfahrtsaal` stays as written.
- Docs and design stay green under `npm run canon` and `npm run canon:strict`.

## Review Focus

- **A broken example inside a fence** — must stay invisible to the gate, or every doc that demonstrates GFM tables fails.
- **Two valid tables in one section** — separated by a blank line, each with its own delimiter row; must pass and count as two tables.
- **A pipe row before any table in its section** — out of scope by the ticket's wording ("a section that already has a table header"); it must not be flagged.
- **The real tree** — the defect D4 found in `design/ux/card-detail.md` §12 is still present at the branch base; the gate must name it before the document is repaired, and the document is repaired in the same change so the repository gate ends green.
- **Exit code** — the CLI contract is 0 clean, 1 defect, 2 usage error; orphans are defects, so 1, never 2.

---

### Task 1: Seed the failing fixture and the failing test

**Files:**
- Create: `tests/canon/fixtures/tables-orphaned/bad.md`
- Modify: `tests/canon/table-integrity.test.mjs`
- Modify: `tests/canon/fixtures/tables-clean/good.md`

**Interfaces:**
- Consumes: `run(argv)` and `fixture(name)` helpers already in the test file.
- Produces: violation objects gain `kind: "orphan"` (no `expected`/`actual`); existing misaligned objects gain `kind: "misaligned"`.

- [x] **Step 1: Write the orphan fixture**

`bad.md` holds a valid header and one row, a prose paragraph, then two further rows (`line 14` and `line 15`).

- [x] **Step 2: Add the failing assertions**

`fixture("tables-orphaned")` must exit 1 with `violations[0]` at `line: 14`, `kind: "orphan"`; stderr must contain `bad.md:14: orphaned table row`. The clean fixture gains two valid tables in one section and asserts `report.tables === 4`.

- [x] **Step 3: Run the canon suite and watch it fail**

Run: `npm run test:canon`
Expected: 2 failed, both because the gate exits 0 on the orphan fixture.

### Task 2: Teach the gate the orphan rule

**Files:**
- Modify: `scripts/table-integrity.mjs`
- Modify: `docs/test-plan.md` (gate 1b contract)
- Modify: `design/ux/card-detail.md` §12

**Interfaces:**
- Produces: `audit()` reports `{file, line, kind: "orphan", row}` and keeps `{file, line, kind: "misaligned", table, expected, actual, row}`.

- [x] **Step 1: Add section state and the orphan branch** — `HEADING` resets it, a recognised table sets it, a pipe row that is not a table start reports when it is set.
- [x] **Step 2: Print orphans distinctly** — `file:line: orphaned table row — …` with the row beneath, summary counts all defects.
- [x] **Step 3: Run the canon suite** — first run fails only the repository case, naming `design/ux/card-detail.md:463`; that is the blind spot caught on the real tree.
- [x] **Step 4: Repair §12** — the two prose paragraphs move below the completed contrast table, so all nine rows render. No content is dropped.
- [x] **Step 5: Re-run `npm run test:canon` and `npm run gate:tables`** — both green.
- [x] **Step 6: Commit** — `fix(#75): gate table rows orphaned by prose`.
