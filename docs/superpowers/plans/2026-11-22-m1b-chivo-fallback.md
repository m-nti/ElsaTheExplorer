# #81 — Metric-matched Chivo fallback (CLS 0)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The Chivo `font-display: swap` swap moves no text at all — a `Chivo Fallback` face whose advances and vertical metrics already equal Chivo's — so a cold first view reports total CLS 0.

**Closes:** #81 · **Branch:** `fix/m1b-chivo-fallback` · **Base:** `985c678` · **Owner:** `performance-analyst` · **Cross-check:** `cs-frontend-engineer`

**Architecture:** #26 fixed the dominant shift (the Ultra wordmark) with a metric-matched interim face and left `0.0006` on the Chivo swap. The residual is vertical: the tagline and the eyebrow move 1 px because the interim face is whatever the OS supplies (`system-ui` → Segoe UI on Windows). The fix is the same mechanism as `Ultra Fallback`, not a change to the loading policy: a `local()` face in `globalFontface`, placed immediately after `"Chivo"` in the `fonts.body` token stack, with `size-adjust` from measured advances and `ascent-`/`descent-override` derived from Chivo's own `hhea` (940/−250 at 1000 upem). Chivo's bytes, `font-display: swap`, and the Ultra face are untouched.

**Tech Stack:** Svelte 5.59.1, Vite 8.3.8, Vitest 5.1.1, Playwright 1.65.1, Panda CSS 2.6.0.

**Spec:** `docs/audits/m1-lcp-fetch.md` §"Why CLS was not zero" (the attribution table and the Ultra precedent), `design/art/art-bible.md` §8 (loading policy: `swap`), issue #81.

## Global Constraints

- `font-display: swap` stays for **both** faces — the art bible requires it; a swap that cannot be seen is the goal, not `optional`/`block`.
- Font bytes do not change: Chivo stays the 29,368 B subset, Ultra unchanged; the fallback is `local()`-only and adds zero bytes.
- The fallback must be the **immediate** successor of `"Chivo"` in `fonts.body`; behind `system-ui` it would never be reached.
- Metric overrides are relative to the **adjusted** em: `ascent-override = 94 / size-adjust`, `descent-override = 25 / size-adjust`, `line-gap-override: 0%`. Editing `size-adjust` without re-deriving them silently reintroduces the shift.
- The fallback base must be metric-compatible across platforms: `local("Arial")` (Windows/macOS) then `local("Liberation Sans")` (Linux; Arial-metric-compatible, same 1854/434/67 hhea).
- Tokens are the only numeric authority; no component CSS is touched.
- `npm run verify` is the local mirror of CI; the Playwright gate is still pending under #24.

## Review Focus

1. **A fallback behind `system-ui`** — the face is declared but never selected; CLS is unchanged and the test for the descriptor still passes while the behaviour does not. The stack order is asserted, not just the `@font-face`.
2. **`size-adjust` edited without the overrides** — the line box changes by ~1 px per 5 % and the swap returns; the derived-metric relation is a test, not a comment.
3. **A `url()` sneaking into the fallback** — a second font download for an interim face; the contract asserts `local()`-only and zero bytes.
4. **Windows-only verification** — Arial is absent on Linux; the second `local()` and the metric compatibility of Liberation Sans are what make the Linux run meaningful. Verified here by argument and by the Linux lockfile/gate set, not by a Linux browser (no runner: #24).
5. **A final-state visual change** — the token stack gains a family; once Chivo loads nothing may differ. Screenshot equality after `document.fonts.ready` is the check.

---

### Task 1: Pin the fallback contract (failing)

**Files:**
- Create: `tests/unit/chivo-fallback.test.ts`

**Interfaces:**
- Consumes: the default export of `panda.config.ts` (`globalFontface`) and the `tokens` export of `design/tokens/tokens.ts` (`fonts.body.value`).
- Produces: nothing other tasks import; the test alone.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/chivo-fallback.test.ts
import { statSync } from "node:fs";
import { describe, expect, it } from "vitest";
import config from "../../panda.config";
import { tokens } from "../../design/tokens/tokens";

const faces = config.globalFontface as Record<string, Record<string, string>>;
const fallback = faces["Chivo Fallback"];
const body = tokens.fonts.body.value as string;

// Chivo hhea, read from public/fonts/chivo-latin.woff2: 940 / -250, upem 1000, lineGap 0.
const CHIVO_ASCENT = 94;
const CHIVO_DESCENT = 25;

it("declares a Chivo Fallback face that downloads nothing", () => {
  expect(fallback).toBeDefined();
  expect(fallback?.src.startsWith("local(")).toBe(true);
  expect(fallback?.src).not.toContain("url(");
  expect(fallback?.fontDisplay).toBe("swap");
  expect(fallback?.fontWeight).toBe("400 700");
});

it("puts the fallback immediately after Chivo in the body stack", () => {
  const [first, second] = body.split(",").map((family) => family.trim());
  expect(first).toBe('"Chivo"');
  expect(second).toBe('"Chivo Fallback"');
});

it("derives the overrides from Chivo's hhea and the measured advance ratio", () => {
  const sizeAdjust = Number.parseFloat(fallback?.sizeAdjust ?? "");
  expect(sizeAdjust).toBeGreaterThan(100);
  expect((Number.parseFloat(fallback?.ascentOverride ?? "") * sizeAdjust) / 100).toBeCloseTo(CHIVO_ASCENT, 1);
  expect((Number.parseFloat(fallback?.descentOverride ?? "") * sizeAdjust) / 100).toBeCloseTo(CHIVO_DESCENT, 1);
  expect(fallback?.lineGapOverride).toBe("0%");
});

it("keeps swap on Chivo and Ultra and their bytes where they were", () => {
  expect(faces.Chivo?.fontDisplay).toBe("swap");
  expect(faces.Ultra?.fontDisplay).toBe("swap");
  expect(faces.Chivo?.src).toContain("/fonts/chivo-latin.woff2");
  expect(faces.Ultra?.src).toContain("/fonts/ultra-latin.woff2");
  expect(statSync(new URL("../../public/fonts/chivo-latin.woff2", import.meta.url)).size).toBeLessThanOrEqual(30_000);
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/unit/chivo-fallback.test.ts --project unit`
Expected: FAIL — `fallback` is `undefined` (`Cannot read properties of undefined` in the `src` assertion / `toBeDefined` fails).

- [ ] **Step 3: Commit the red test**

```bash
git add tests/unit/chivo-fallback.test.ts
git commit -m "test(#81): pin the Chivo fallback contract before the face exists"
```

---

### Task 2: Pin the browser behaviour (failing)

**Files:**
- Modify: `tests/e2e/lcp.spec.ts:180-187` (the CLS assertion and its comment) and append one test.

**Interfaces:**
- Consumes: the built artifact served by `npm run preview`.
- Produces: `measureFallbackMatch(page)` — a local helper returning `{ chivo: Metrics; fallback: Metrics }` where `Metrics = { lineBox: number; baseline: number; width: number }`.

- [ ] **Step 1: Tighten the CLS assertion**

Replace `expect(seen.cls).toBeLessThan(0.005)` with:

```ts
  // CLS: the picture reserves its box, and both face swaps are metric-matched, so
  // nothing moves at all. WebKit has no Layout Instability API (the count is 0 by
  // construction there); Chromium's 0 is the measured claim.
  expect(seen.imageShifts).toBe(0);
  expect(seen.cls).toBe(0);
```

- [ ] **Step 2: Add the metric-match test**

```ts
test("the Chivo fallback has Chivo's line box, baseline and advance width", async ({ page }) => {
  await page.goto("/", { waitUntil: "load" });
  const match = await page.evaluate(async () => {
    await document.fonts.load('400 13px "Chivo"');
    await document.fonts.load('600 11px "Chivo"');
    await document.fonts.ready;
    const probe = (family: string, weight: number, size: number) => {
      const host = document.createElement("div");
      host.style.cssText =
        `position:absolute;left:-10000px;top:0;font-family:${family};font-weight:${weight};` +
        `font-size:${size}px;line-height:normal;white-space:nowrap`;
      host.textContent = "Die Sammlung ist das Produkt. Elsa ist der Sammlungsmechanismus.";
      document.body.appendChild(host);
      const box = host.getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(host);
      const width = range.getBoundingClientRect().width;
      const marker = document.createElement("span");
      marker.style.cssText = "display:inline-block;width:0;height:0;vertical-align:baseline";
      host.appendChild(marker);
      const baseline = marker.getBoundingClientRect().bottom - box.top;
      host.remove();
      return { lineBox: box.height, baseline, width };
    };
    return {
      chivo: probe('"Chivo"', 400, 13),
      fallback: probe('"Chivo Fallback", sans-serif', 400, 13),
      chivoBold: probe('"Chivo"', 600, 11),
      fallbackBold: probe('"Chivo Fallback", sans-serif', 600, 11),
    };
  });
  for (const [chivo, fallback] of [
    [match.chivo, match.fallback],
    [match.chivoBold, match.fallbackBold],
  ] as const) {
    expect(Math.abs(fallback.lineBox - chivo.lineBox)).toBeLessThan(0.1);
    expect(Math.abs(fallback.baseline - chivo.baseline)).toBeLessThan(0.1);
    expect(Math.abs(fallback.width - chivo.width)).toBeLessThan(chivo.width * 0.01);
  }
});
```

- [ ] **Step 3: Run it and watch it fail**

Run: `npx playwright test tests/e2e/lcp.spec.ts --project=chromium` (on a build served on a private port if 4173 is taken)
Expected: FAIL — `cls` is `0.000565` at 390 × 844; the metric test fails on `lineBox` (fallback is Segoe UI: 133 vs 119 per 100 px).

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/lcp.spec.ts
git commit -m "test(#81): CLS 0 and a metric-matched Chivo swap, asserted in the browser"
```

---

### Task 3: The face and the stack (green)

**Files:**
- Modify: `panda.config.ts:37-68` (`globalFontface`)
- Modify: `design/tokens/tokens.ts:293-296` (`fonts.body`)

**Interfaces:**
- Consumes: nothing.
- Produces: the `"Chivo Fallback"` face and `--elsa-fonts-body: "Chivo", "Chivo Fallback", …`.

- [ ] **Step 1: Add the face**

```ts
    /**
     * The metric-matched interim face for Chivo (#81). `swap` is the art-bible rule,
     * so body text changes face after first paint; without a face whose advances and
     * vertical metrics already match Chivo, that swap moves the tagline and eyebrow
     * by 1 px (measured CLS 0.000565 at 390 x 844). Ratios from measured advances at
     * 100 px: Chivo 3268.149 / Arial 3095.654 = 105.57 %. Overrides are relative to
     * the adjusted em: Chivo's hhea 940 / -250 at 1000 upem = 94 % / 25 %, divided by
     * 1.0557. Arial is metric-compatible with Liberation Sans on Linux, so the same
     * numbers hold on the CI runner.
     */
    "Chivo Fallback": {
      src: 'local("Arial"), local("Liberation Sans")',
      fontStyle: "normal",
      fontWeight: "400 700",
      fontDisplay: "swap",
      sizeAdjust: "105.57%",
      ascentOverride: "89.04%",
      descentOverride: "23.68%",
      lineGapOverride: "0%",
    },
```

- [ ] **Step 2: Put it in the stack**

`design/tokens/tokens.ts`:

```ts
    body: value('"Chivo", "Chivo Fallback", "Avenir Next", Avenir, system-ui, sans-serif'),
```

- [ ] **Step 3: Run the unit contract**

Run: `npx vitest run tests/unit/chivo-fallback.test.ts --project unit` → PASS (4 tests).

- [ ] **Step 4: Rebuild and run the browser proof**

Run: `npm run build && npx playwright test tests/e2e/lcp.spec.ts`
Expected: PASS on chromium, webkit, mobile-chrome, mobile-safari; `cls` 0 at 390 × 844 and 1280 × 720.

- [ ] **Step 5: Commit**

```bash
git add panda.config.ts design/tokens/tokens.ts
git commit -m "fix(#81): metric-matched Chivo fallback — the swap moves nothing"
```

---

### Task 4: Evidence and the record

**Files:**
- Modify: `docs/audits/m1-lcp-fetch.md` (append §"#81 — the last 0.0006")

**Interfaces:**
- Consumes: the before/after numbers from Tasks 2–3.
- Produces: the shift-source table and the measured advance ratio the ticket's DoD asks for.

- [ ] **Step 1: Record the table**

Before → after at 390 × 844: CLS `0.000565` → `0`; 1280 × 720: `0` → `0`. Sources before: eyebrow `y 32 → 33`, tagline `y 169.5 → 170.5` (1 px each, vertical only). After: no layout-shift entries. Advance: Chivo `3268.149` / Arial `3095.654` at 100 px = `1.0557` → `size-adjust: 105.57 %`; overrides `94/1.0557 = 89.04 %`, `25/1.0557 = 23.68 %`.

- [ ] **Step 2: Run the gates**

Run: `npm run lint` → 0 errors. Run: `npm run check:ts && npm run check` → 0 errors.
Run: `npm run test:unit` → green. Run: `npm run build` → green. Run: `npm run gate:fonts` → green (bytes unchanged).

- [ ] **Step 3: Commit**

```bash
git add docs/audits/m1-lcp-fetch.md
git commit -m "docs(#81): before/after CLS and the measured Chivo advance ratio"
```
