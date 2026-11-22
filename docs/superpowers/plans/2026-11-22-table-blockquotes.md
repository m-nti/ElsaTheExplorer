# Table gate: tables inside blockquotes — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `scripts/table-integrity.mjs` see GFM tables written inside blockquotes and apply the same rectangularity and orphan rules to them, closing issue #102.

**Architecture:** Each line is reduced to its container content before the gate classifies it: leading blockquote markers (`>` plus one optional space, repeatable) are stripped and the marker depth is kept. Table starts require the delimiter row at the same depth, and the row loop stops when the depth changes, so a quoted table validates like an unquoted one and a quoted header followed by an unquoted delimiter is not mistaken for a table. Fence state carries the depth it opened at, so a fenced example inside a quote stays invisible.

**Tech Stack:** Node 26 ESM, no dependencies added.

**Spec:** issue #102 · `Closes #102` · branch `fix/table-blockquotes` · base `origin/main` at `2a04a2a` · gate contract `docs/test-plan.md` gate 1b.

## Global Constraints

- Node 26 / npm 11; no new dependency.
- No allowlist and no ignore list in the gate: an exemption is how a table gate dies.
- The non-quoted path must behave exactly as today; the `tables-clean`, `tables-seeded`, `tables-orphaned` cases and the repository case remain the proof.
- `gate:tables` stays the single table gate in `.github/gates.json`; `npm run test:canon` is the only test surface changed.
- Canon: the forbidden-vocabulary list in `AGENTS.md` and `scripts/canon-allowlist.json` applies unchanged to every line added here; `Der Abfahrtsaal` stays as written.
- Docs and design stay green under `npm run canon` and `npm run canon:strict`.
- `npm run lint` and the typecheck run clean on the exact tree pushed, before the commit.

## Review Focus

- **A broken example inside a quoted fence** — must stay invisible to the gate, exactly like an unquoted fenced example.
- **A quoted header with an unquoted delimiter row** — GFM ends the blockquote at the unquoted line, so this is not a table; the gate must neither count nor flag it.
- **Two quoted tables in one section** — each with its own quoted delimiter row; both count, both validate, neither is an orphan.
- **A quoted pipe row in a section that already showed a table** — keeps today's orphan rule: it is reported, because prose or a depth change detached it from a header.
- **The real tree** — measured zero blockquote-table lines under `docs/` and `design/` at the branch base, so the repository case must stay green and the fix is latent-defect coverage.
- **Exit code** — the CLI contract is 0 clean, 1 defect, 2 usage error; a quoted misalignment or orphan is a defect, so 1, never 2.

---

### Task 1: Seed the quoted fixtures and the failing tests

**Files:**
- Create: `tests/canon/fixtures/tables-quoted-bad/bad.md`
- Create: `tests/canon/fixtures/tables-quoted-orphaned/bad.md`
- Modify: `tests/canon/fixtures/tables-clean/good.md`
- Test: `tests/canon/table-integrity.test.mjs`

**Interfaces:**
- Consumes: `run(argv)` and `fixture(name)` helpers already in the test file.
- Produces: the fixture names `tables-quoted-bad` (misaligned row at `line: 9`, `expected: 2`, `actual: 3`) and `tables-quoted-orphaned` (orphan at `line: 9`); the clean corpus grows to five tables.

- [x] **Step 1: Write the misaligned quoted fixture**

`bad.md` holds a header and one honest row, then a row with a surplus third field at line 9:

```md
# Seeded blockquote table defects

A table inside a blockquote is still a table: GFM renders it inside the quote,
so the header's field count is still the contract.

> | ID | Assertion |
> | --- | --- |
> | Q-1 | honest row with two fields |
> | Q-2 | surplus note | stray third field |
```

- [x] **Step 2: Write the quoted orphan fixture**

`bad.md` holds a quoted table, quoted prose, then two quoted rows at lines 9-10:

```md
# Seeded blockquote orphan defects

> | Text element | Ratio |
> | --- | --- |
> | honest row | 4.5:1 |

> **Audit note**: this paragraph sits where the reader expects the next rows.

> | Plate number | 4.5:1 |
> | Serial foot | 4.5:1 |
```

- [x] **Step 3: Extend the clean corpus**

Append a quoted table, a broken example inside a quoted fence, and a quoted header whose delimiter is unquoted. `report.tables` becomes 5; the mixed-depth pair is text, not a table.

- [x] **Step 4: Add the failing assertions**

`fixture("tables-quoted-bad")` must exit 1 with one violation `{line: 9, kind: "misaligned", expected: 2, actual: 3}`; stderr must contain `bad.md:9: expected 2 field(s), found 3`. `fixture("tables-quoted-orphaned")` must exit 1 with `violations[0]` at `line: 9`, `kind: "orphan"`; stderr must contain `bad.md:9: orphaned table row`. `fixture("tables-clean")` must stay clean and report five tables.

- [x] **Step 5: Run the canon suite and watch it fail**

Run: `npm run test:canon`
Expected: the quoted cases fail because the gate reports them clean, and the clean case reports four tables instead of five.

### Task 2: Teach the gate to strip the quote marker

**Files:**
- Modify: `scripts/table-integrity.mjs`

**Interfaces:**
- Consumes: `fields(line)`, `DELIMITER`, `FENCE`, `HEADING`, `INDENTED_CODE`.
- Produces: `unquote(line) -> { depth: number, content: string }`; violation objects keep their current shape and gain no fields.

- [x] **Step 1: Add `unquote`** — strip `^\s{0,3}>[ \t]?` repeatedly, counting markers; a line without a marker returns depth 0 and the line unchanged.
- [x] **Step 2: Carry the content and depth through the loop** — fence state records the depth it opened at; heading and indented-code tests read the content; the table start requires the delimiter row at the same depth; the row loop stops at a different depth or a non-pipe content line; fields are split from the content.
- [x] **Step 3: Run the canon suite** — all cases green, including the repository case.
- [x] **Step 4: Run the gate over the real tree and the seeded fixtures by hand** — paste the failing fixture output and the clean real-tree output.

### Task 3: Record the contract and land

**Files:**
- Modify: `docs/test-plan.md` (gate 1b)
- Modify: `scripts/table-integrity.mjs` (header comment)

- [x] **Step 1: State the quoted-table rule in gate 1b** — a quoted table is judged with the marker stripped; every row must repeat the header's quote depth.
- [x] **Step 2: Note the rule in the script header** — one paragraph beside the orphan paragraph.
- [x] **Step 3: Full local gates** — `npm run lint`, `npm run check`, `npm run check:ts`, `npm run test:canon`, `npm run gate:tables`, `npm run canon`, `npm run canon:strict`.
- [x] **Step 4: Commit, push, open the PR** — `fix(#102): gate tables inside blockquotes`, body `Closes #102`, request `cs-code-auditor` cross-check, do not merge.
