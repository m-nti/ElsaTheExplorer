# Canon Gate — Svelte Template Surface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The canon gate reads Svelte template text and its copy-bearing attributes, so `src/App.svelte` visitor copy (`Die Sammlung ist das Produkt…`) can no longer ship unscanned, while `<script>`/`<style>`/comment bodies stay silent.

**Architecture:** `scripts/canon-check.mjs` already has the two pieces #38/PR #46 added: the stateful region masker (`maskHtmlRegions`) and the markup reader (`htmlSegments`, which returns copy-attribute values plus text between tags). Both are keyed off "is this HTML?" today. The change makes the *reader* markup-generic instead: a `.svelte` file is masked with the same state machine (state per file, carried across lines), and its live segments come from `htmlSegments` rather than from the `src/**` string-literal reader. No new dependency, no new rule, no allowlist growth.

**Tech Stack:** Node 26 ESM (no dependencies), Vitest 5.1.1 `canon` project (`npm run test:canon`), the gate CLI `node scripts/canon-check.mjs --json`.

**Spec:** issue #49 (`[D12b] Canon gate: scan Svelte template text`), implementing `docs/superpowers/plans/2026-11-22-v2-delivery.md` §0 (harness), the canon rules in `AGENTS.md`, and the gate contract in `scripts/canon-check.mjs`'s header. Depends on #38 / PR #46.

**Closes #49** · branch `feat/d12b-canon-svelte` · base `6b9c50a` (main)

## Global Constraints

- Canon: **Die Sammlung / The Collection**, progress verb **gesammelt / collected**, **Der Abfahrtsaal**; the water ban and the retired binder noun are the `AGENTS.md` canon list, the retired collection name and its progress verb are `docs/decisions.md` D-04b — the gate names them, this plan does not repeat them as copy; at most one `!`, never in error/announcement/aria copy.
- `npm run canon` clean on the real tree; `scripts/canon-allowlist.json` **`maxBaseline` stays 7** and gains **no entry** unless a real history row matches it, with a reason.
- Gate chain is fail-closed: no `--if-present`, no `|| true`, no skipped gate; `.github/gates.json` and `ci.yml` are untouched by this ticket.
- Report paths are POSIX on every host (forward slashes), so an allowlist entry means the same thing on Windows and Linux.
- Rules, allowlist semantics, exit codes (0/1/2) and the `--strict` ratchet keep their current contract; `bang` stays a copy-deck/`.ts` rule (non-goal here).
- Tests are the contract: every case spawns the CLI and asserts `(exit code, parsed report)`; fixtures under `tests/canon/fixtures/` are the seeded failures.
- Node/npm as pinned by `.nvmrc` / `engines` (Node 26, npm 11); no new dependency, no new npm script.

## Review Focus

- **A masked region that never closes** — an unclosed `<script>`/`<style>` in a `.svelte` file would mask the rest of the file and silence real copy; the #38 uppercase-close class. Pinned by the seeded line 25 (live text *after* `</style>` **and** after `<!-- -->`) and the uppercase `</SCRIPT>` close in Task 2's fixture.
- **Template text read as markup, not copy** — the exact blind spot in #49. Pinned by Task 2's `[7, 8]` DE/EN text-node assertions.
- **A copy attribute on its own line missed** — `alt`/`aria-label` on a wrapped tag (the `html-attributes` shape). Pinned by the fixture's `alt` on its own line, Task 2.
- **Svelte syntax read as copy, or its column shifted** — `{#each …}`, `{model.serial}`, `class="katalog-grid"`, `id="katalog-liste"` must stay silent; a hit in a text node beside an expression keeps its column. Pinned by Task 2's line-6 "hooks are not copy" case.
- **Silencing copy dictionaries with the script body** — masking `<script>` fixes false positives on code but must not lose copy coverage: copy that lives in a `.ts` module is still scanned (seeded `src/copy.ts`, `entity-de`, line 1) and stays red. Pinned by the existing seeded test, which Task 2 must keep green, and restated in the script's header.

---

### Task 1: Report paths are POSIX on every host (prerequisite, evidence in this report)

**Why this is in *#49*:** on Windows `relative()` yields `design\art\art-bible.md`, while every allowlist entry is written `design/art/art-bible.md`. The allowlist therefore covers nothing, the gate reports **128 violations in 17 files** on a clean tree, and 5 canon self-tests fail — measured on this branch base `6b9c50a` before any change:

```
canon-check: 128 violation(s) in 17 file(s) — canon: … (the gate's summary line)
 Tests  5 failed | 24 passed (29)
```

That is the pre-existing Windows-only defect, and it blocks #49's acceptance criterion "`npm run canon` clean on the real tree". It is ≤10 lines, no dependency, so it is fixed here rather than deferred (`AGENTS.md`, fix small debt now).

**Files:**
- Modify: `scripts/canon-check.mjs`
- Test: `tests/canon/canon.test.mjs`

**Interfaces:**
- Produces: `posixPath(path: string): string` (module-local) — `path.split(sep).join("/")`. Every `relative(root, file)` that leaves the process (JSON `scanned`, violation `file`, error text) or is compared with an allowlist `file` goes through it.

- [ ] **Step 1: Write the failing test** — append to `tests/canon/canon.test.mjs`:

```js
describe("canon-check: report paths", () => {
  it("reports POSIX paths on every host", () => {
    const { report } = run([]);
    expect(report.scanned.filter((path) => path.includes("\\"))).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it — verify RED**

Run: `npm run test:canon`
Expected: 6 failed (this case plus the 5 pre-existing separator failures: "flags every forbidden family", "passes the real repo", "resets the masking state per file", "excuses exactly one reasoned line", "warns but passes by default"). On Linux this one case passes and only the other 5 are host-independent — record which host produced which.

- [ ] **Step 3: Normalise at the boundary**

Add next to `describe()`:

```js
/** Report paths are POSIX on every host: an allowlist entry must mean one thing. */
function posixPath(path) {
  return path.split(sep).join("/");
}
```

Use it in `describe()` (`posixPath(relative(root, violation.file))`), in `applyAllowlist` (`posixPath(relative(root, violation.file)) !== file`), in the `baselineHits` comparison in `main()`, in the JSON `scanned`/`violations[].file` fields, and in the allowlist-error message.

- [ ] **Step 4: Verify GREEN**

Run: `npm run test:canon` → 0 failed. Run: `npm run canon` → exit 0, `canon-check: clean (…, 61 allowlisted line(s), 7 known defect(s) in the baseline (issue #31))`.

- [ ] **Step 5: Commit**

```bash
git add scripts/canon-check.mjs tests/canon/canon.test.mjs
git commit -m "fix(canon): report POSIX paths so the allowlist matches on Windows (#49)"
```

---

### Task 2: Svelte template text and copy-bearing attributes are live

**Files:**
- Modify: `scripts/canon-check.mjs`
- Create: `tests/canon/fixtures/svelte-template/src/App.svelte`
- Create: `tests/canon/fixtures/clean/src/Clean.svelte`
- Test: `tests/canon/canon.test.mjs`

**Interfaces:**
- Produces: `isSvelteFile(file: string): boolean` (`.svelte`), `isMarkupFile(file: string): boolean` (HTML/HTM/Svelte — renamed from `isHtmlFile`).
- Consumes: `maskHtmlRegions(line, state)`, `htmlSegments(line)` — unchanged.
- Behaviour: in `liveSegments`, `.svelte` returns `htmlSegments(line)` **before** the `src/**` string-literal branch. In `main()`, the masker runs for every `isMarkupFile` file with a per-file `markupState`; `sources` keeps the raw lines (allowlist matching).

- [ ] **Step 1: Write the seeded fixture** — `tests/canon/fixtures/svelte-template/src/App.svelte`.

The seeded copy is the retired collection name in DE, its EN twin, and the DE compound that ends in it (the `compound-de` fixture's shape) — `docs/decisions.md` D-04b names them, this plan does not. They appear below as `<de>`, `<en>`, `<de-compound>` so the plan carries no retired copy; the committed fixture carries the words. Structure is the contract — one element per line, so the assertions' line numbers hold:

```svelte
<script lang="ts">
  // <de> does not belong in a script comment.
  const copy = { de: "<de> does not belong in a script literal." };
</SCRIPT>

<main class="katalog-grid" id="katalog-liste">
  <h1><de> ist kein Name mehr</h1>
  <p><en> is not the name.</p>
  <img
    src="/karte.webp"
    alt="<de-compound> der Hündin"
  />
  <button aria-label="<de> öffnen" type="button">Öffnen</button>
  <span title="<de>">Karte</span>
  <input placeholder="<de> durchsuchen" />
</main>

<style>
  .katalog-grid::after {
    content: "<de> does not belong in a stylesheet.";
  }
</style>

<!-- <de> does not belong in a comment. -->
<p><de> bleibt verboten.</p>
```

Line map the assertions rely on: 1 opens `<script>`, 2 comment, 3 literal, 4 uppercase `</SCRIPT>` close, 6 markup hooks, **7 DE text node, 8 EN text node, 11 `alt` on its own line, 13 `aria-label`, 14 `title`, 15 `placeholder`**, 18–22 style block, 24 comment, **25 live text after both closes**.

- [ ] **Step 2: Write the clean fixture** — `tests/canon/fixtures/clean/src/Clean.svelte`, exactly (the archival concept, which stays legal):

```svelte
<main>
  <h1>Die Sammlung</h1>
  <p class="eyebrow">Katalogkarte 42 · Katalog-Nummer 42</p>
  <img src="/karte.webp" alt="Katalogkarte der Hündin" />
  <p>Sammelwerk · Erste Auflage</p>
</main>
```

- [ ] **Step 3: Write the failing tests** — append to `tests/canon/canon.test.mjs`:

```js
describe("canon-check: Svelte template surface (D12b)", () => {
  const svelteHits = () => {
    const { report } = fixture("svelte-template");
    return report.violations.filter((violation) => violation.file === "src/App.svelte");
  };

  it("flags template text for the German and the English entity rule", () => {
    const { code } = fixture("svelte-template");
    expect(code).toBe(1);
    const rules = svelteHits()
      .filter((violation) => violation.line === 7 || violation.line === 8)
      .map((violation) => `${violation.line}:${violation.rule}`);
    expect(rules).toEqual(["7:entity-de", "8:entity-en"]);
  });

  it("flags copy-bearing attributes: alt, aria-label, title, placeholder", () => {
    const lines = svelteHits()
      .filter((violation) => violation.line > 8 && violation.line < 16)
      .map((violation) => violation.line);
    expect(lines).toEqual([11, 13, 14, 15]);
  });

  it("never reads a <script>, <style> or comment body as copy", () => {
    // Line 3 (script literal) and line 20 (stylesheet content) are the ones a
    // string-literal reader would flag; a hit on them is the false positive this
    // masks. Line 25 proves the state closes.
    expect(svelteHits().map((violation) => violation.line)).toEqual([
      7, 8, 11, 13, 14, 15, 25,
    ]);
  });

  it("leaves class/id hooks alone", () => {
    const terms = svelteHits().map((violation) => violation.term);
    expect(terms).not.toContain("katalog-grid");
    expect(terms).not.toContain("katalog-liste");
    expect(svelteHits().some((violation) => violation.line === 6)).toBe(false);
  });

  it("keeps the archival concept legal in Svelte markup", () => {
    const { code, report } = fixture("clean");
    expect(code).toBe(0);
    expect(report.scanned).toContain("src/Clean.svelte");
  });
});
```

- [ ] **Step 4: Run them — verify RED**

Run: `npm run test:canon`
Expected: the text-node and attribute cases fail with `[]` / `[]` (no `.svelte` hit at all); the "never reads" case fails because lines 3 and 17 **are** flagged today (the `src/**` literal reader); "leaves class/id hooks alone" passes trivially — keep it as a guard, and say so in the report.

- [ ] **Step 5: Implement**

In `scripts/canon-check.mjs`:

```js
function isSvelteFile(file) {
  return file.endsWith(".svelte");
}

/** Markup files get the region mask and the markup reader. */
function isMarkupFile(file) {
  return file.endsWith(".html") || file.endsWith(".htm") || isSvelteFile(file);
}
```

`liveSegments`, first branch:

```js
  // Svelte template: text nodes and copy-bearing attribute values. `<script>`,
  // `<style>` and comments are code, not copy — masked before we get here.
  if (isSvelteFile(file)) return htmlSegments(line);
```

`main()`: replace `isHtmlFile(file)` with `isMarkupFile(file)` (rename the local `htmlState` to `markupState`) — the state machine is unchanged and already resets per file.

Update the script header: the `live` scope paragraph now names "`src/**/*.svelte` template text and copy-bearing attributes" as live surfaces, states that `<script>`/`<style>`/comment bodies are treated as code (copy in code belongs in a `.ts` module, which the `src/**` literal reader still scans), and records the ruling: a Svelte `<script>` body is a component body, exactly like `index.html`'s.

- [ ] **Step 6: Verify GREEN**

Run: `npm run test:canon` → 0 failed. Run: `npm run canon` → exit 0, model unchanged (`7 known defect(s)`), and `report.files` grows by the two real `.svelte` files where they already were.

- [ ] **Step 7: Commit**

```bash
git add scripts/canon-check.mjs tests/canon/canon.test.mjs tests/canon/fixtures
git commit -m "feat(canon): scan Svelte template text and copy attributes (#49)"
```

---

### Task 3: The report names the templates it read, and the real tree stays clean

**Files:**
- Modify: `scripts/canon-check.mjs`
- Test: `tests/canon/canon.test.mjs`

**Interfaces:**
- Produces: JSON report field `templates: string[]` — sorted POSIX paths of the `.svelte` files whose template text was read. It is the same kind of assertion `scanned` is: "'src/App.svelte' is read" becomes a fact a test can check, not a claim in a comment.

- [ ] **Step 1: Write the failing test**

```js
describe("canon-check: the real tree (D12b)", () => {
  it("names every Svelte template whose text it read", () => {
    const { report } = run([]);
    expect(report.templates).toEqual([
      "src/App.svelte",
      "src/lib/components/CardFace.svelte",
    ]);
  });

  it("keeps the real tree clean and the baseline cap at 7", () => {
    const { code, report } = run([]);
    expect(code).toBe(0);
    expect(report.allowlist.maxBaseline).toBe(7);
    expect(report.allowlist.baseline).toBeLessThanOrEqual(7);
  });
});
```

- [ ] **Step 2: Run it — verify RED**

Run: `npm run test:canon`
Expected: "names every Svelte template…" fails (`report.templates` is `undefined`). The baseline-cap case is a guard that must already be true after Task 1 — state that in the report.

- [ ] **Step 3: Implement**

Collect the paths in the scan loop (`if (isSvelteFile(file)) templates.add(posixPath(relativeFile));` next to the mask call) and add `templates: [...templates].sort(),` to the JSON object beside `scanned`.

- [ ] **Step 4: Verify GREEN**

Run: `npm run test:canon` → 0 failed.

- [ ] **Step 5: Commit**

```bash
git add scripts/canon-check.mjs tests/canon/canon.test.mjs
git commit -m "test(canon): report the Svelte templates the gate read (#49)"
```

---

### Task 4: Gate chain evidence (no code)

- [ ] **Step 1: Canon + self-tests + full chain**

```bash
npm run canon
npm run test:canon
npm run test:unit
npm run verify
```

Expected: `canon` exit 0 with `7 known defect(s)`; `test:canon` 0 failed; `test:unit` 0 failed; `verify` green for the gate list in `.github/gates.json`. Any failure that is **pre-existing on `main`** (Windows-only unit cases) is named in the PR with the command output — never silently skipped, never "fixed" by weakening a gate.

- [ ] **Step 2: Seeded-failure evidence for the PR**

```bash
node scripts/canon-check.mjs --json --root tests/canon/fixtures/svelte-template
```

Paste the violation lines (7, 8, 9, 10, 11, 12, 22) into the PR body as the fixture output.

- [ ] **Step 3: No allowlist change**

`git diff --stat main -- scripts/canon-allowlist.json` → empty. `maxBaseline` is still 7; no entry added.
