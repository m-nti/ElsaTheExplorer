# M6 — Binder alt text and focus return Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every binder tile carries a meaningful text alternative from the manifest, and every card-detail close path returns focus to the control that opened it — never to `<body>`.

**Architecture:** The a11y runtime ADR-0010 §3 already fixes the contract: an opener map keyed by surface plus one `restoreFocus` ladder (captured opener → `#open-pack` → `#stage`). This plan implements the pure pieces (`domain/tile.ts`, `a11y/focus.ts`, `a11y/focus.svelte.ts`, `a11y/deep-link.ts`) so they are unit-testable in the node Vitest project, then builds the two components that use them (`CardTile.svelte`, `CardDialog.svelte`) and wires the binder shell in `App.svelte`. Playwright proves the matrix end to end.

**Tech Stack:** Svelte 5 runes, TypeScript 7 strict, Vitest 5 (node project), Playwright 1.65, Panda CSS tokens.

**Spec:** `docs/adr/ADR-0010-accessibility-runtime.md` §3 and §8; `docs/audits/a11y-baseline.md` M4 + M6; `design/ux/binder.md` §12; `design/ux/card-detail.md` §4/§12; `design/copy/copy-deck.md` §6.5 + `tile.aria.open*`; `docs/test-plan.md` E-FOC-07/08/15.

**Closes #28** · **Branch:** `fix/m6-alt-text-focus` · **Base:** `6b9c50a`

## Global Constraints

- Canon: **Die Sammlung / The Collection**, verb **gesammelt / collected**; the retired collection names and progress verbs in `design/copy/copy-deck.md` §0.1/§0.2 do not return; the archive stays dry (AGENTS.md canon ruling); max one `!` per surface and zero in alt text, aria labels or announcements; the sixth room is **Der Abfahrtsaal**.
- Accessibility tier **Standard** (WCAG 2.2 AA). Focus must never land on `<body>`; alt text must never be empty on a tile image.
- Scoped CSS consumes Panda tokens only (`var(--elsa-*)` / `var(--tier-*)`); no literals for the properties Stylelint pins; every selector unique across `src/` (selector-diff gate).
- Every player-facing string comes from `src/lib/stores/i18n.svelte.ts`; no hardcoded copy in components.
- No new dependency. No SvelteKit, no router — “route change” is `?photo=` `pushState`/`popstate`.
- One writer per file: this ticket touches `src/App.svelte`, `src/lib/stores/i18n.svelte.ts` and new files only.
- Unit tests run in the **node** Vitest project: no DOM, no `$state` import. DOM behaviour is proven by Playwright.

## Review Focus

- **Manifest alt absent or whitespace** — a photo whose `alt` is `""` or `"   "` must still render a non-empty `alt`, falling back to the printed name (`card.image.alt`); an empty `alt` is exactly the defect #28 fixes.
- **The opener is gone by restore time** — a tile re-rendered by a language switch or a manifest refresh must not strand focus; the ladder falls to `#open-pack`, then `#stage`, and body is never eligible.
- **Deep link opened with no invoker** — closing `?photo=` must land on `#open-pack` (the CTA), not on a stale tile from an earlier session and never on `<body>`.
- **Browser Back with the dialog open** — `popstate` removes `?photo=`; the dialog closes and focus returns to the invoking tile, because the URL is the only navigation this app has.
- **Unknown `?photo=` id** — the dialog must not open, the page stays intact and no seen-write happens; a mistyped link is not an error state.

---

### Task 1: Tile text alternative from the manifest

**Files:**
- Create: `src/lib/domain/tile.ts`
- Test: `tests/unit/tile-alt.test.ts`

**Interfaces:**
- Produces: `tileAlt(photo: Pick<CardPhoto, "alt">, fallbackName: string): string` — trimmed manifest alt, else trimmed fallback; used by `CardTile.svelte` (Task 4).

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { tileAlt } from "$lib/domain/tile";

describe("tileAlt", () => {
  it("uses the manifest description when present", () => {
    expect(tileAlt({ alt: "Elsa schläft auf einer grünen Decke." }, "Deckenhöhlen-Späherin")).toBe(
      "Elsa schläft auf einer grünen Decke.",
    );
  });

  it("falls back to the printed name when the manifest alt is empty", () => {
    expect(tileAlt({ alt: "" }, "Deckenhöhlen-Späherin")).toBe("Deckenhöhlen-Späherin");
  });

  it("treats a whitespace-only alt as missing", () => {
    expect(tileAlt({ alt: "   " }, "Deckenhöhlen-Späherin")).toBe("Deckenhöhlen-Späherin");
  });

  it("never returns untrimmed text", () => {
    expect(tileAlt({ alt: "  Elsa am Beet.  " }, "x")).toBe("Elsa am Beet.");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project unit tests/unit/tile-alt.test.ts`
Expected: FAIL — cannot resolve `$lib/domain/tile`.

- [ ] **Step 3: Implement `src/lib/domain/tile.ts`**

Exact signature above; body trims both inputs and prefers the manifest value when the trimmed string is non-empty.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --project unit tests/unit/tile-alt.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/domain/tile.ts tests/unit/tile-alt.test.ts
git commit -m "feat(a11y): tile alt prefers the manifest description (#28)"
```

---

### Task 2: The focus-return ladder and opener map

**Files:**
- Create: `src/lib/a11y/focus.ts`
- Create: `src/lib/a11y/focus.svelte.ts`
- Test: `tests/unit/focus-return.test.ts`

**Interfaces:**
- Produces: `selectFocusTarget<T>(candidates: readonly (T | null | undefined)[], isUsable: (c: T) => boolean): T | null`
- Produces: `isFocusableTarget(candidate: Element | null | undefined): candidate is HTMLElement` (rejects disconnected, `:disabled`, `[inert]` ancestor, `display:none`/`visibility:hidden`, `body`, `html`)
- Produces: `restoreFocus(opener: Element | null | undefined, doc?: Document): HTMLElement | null`
- Produces: `FocusReturnStore` with `capture(surface, opener)`, `peek(surface)`, `forget(surface)`, `restore(surface, doc?)`; export `focusReturn` singleton and `type FocusSurface = "pack" | "card" | "reset"`.
- Consumes: nothing.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { selectFocusTarget } from "$lib/a11y/focus";
import { FocusReturnStore } from "$lib/a11y/focus.svelte";

const usable = (value: string) => value !== "disabled" && value !== "gone";

describe("selectFocusTarget", () => {
  it("prefers the opener", () => {
    expect(selectFocusTarget(["tile", "cta", "stage"], usable)).toBe("tile");
  });

  it("skips an unusable opener and falls to the CTA", () => {
    expect(selectFocusTarget(["disabled", "cta", "stage"], usable)).toBe("cta");
  });

  it("falls to the stage when the CTA cannot take focus", () => {
    expect(selectFocusTarget([null, "disabled", "stage"], usable)).toBe("stage");
  });

  it("returns null rather than inventing a target", () => {
    expect(selectFocusTarget([undefined, null], usable)).toBeNull();
  });
});

describe("FocusReturnStore", () => {
  it("captures one opener per surface and returns it once", () => {
    const store = new FocusReturnStore();
    const tile = { id: "tile-1" } as unknown as HTMLElement;
    store.capture("card", tile);
    expect(store.peek("card")).toBe(tile);
    store.forget("card");
    expect(store.peek("card")).toBeUndefined();
  });

  it("treats a null opener as the deep-link case, clearing a stale opener", () => {
    const store = new FocusReturnStore();
    store.capture("card", { id: "stale" } as unknown as HTMLElement);
    store.capture("card", null);
    expect(store.peek("card")).toBeUndefined();
  });

  it("keeps surfaces independent", () => {
    const store = new FocusReturnStore();
    const a = { id: "a" } as unknown as HTMLElement;
    store.capture("pack", a);
    store.capture("card", null);
    expect(store.peek("pack")).toBe(a);
    expect(store.peek("card")).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project unit tests/unit/focus-return.test.ts`
Expected: FAIL — cannot resolve `$lib/a11y/focus`.

- [ ] **Step 3: Implement `src/lib/a11y/focus.ts`**

`selectFocusTarget` is the pure loop above. `restoreFocus` builds the ladder `[opener, doc.getElementById("open-pack"), doc.getElementById("stage")]`, calls `selectFocusTarget`, focuses the winner with `{ preventScroll: true }`, returns it. `isFocusableTarget` performs the ADR validity checks and guards for `typeof HTMLElement === "undefined"`.

- [ ] **Step 4: Implement `src/lib/a11y/focus.svelte.ts`**

`Map<FocusSurface, HTMLElement>`; `capture` sets on a truthy opener and deletes on `null`/`undefined`; `restore` takes the opener, deletes it **before** focusing (last intent wins), delegates to `restoreFocus`. No runes: the file must import cleanly in the node project.

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run --project unit tests/unit/focus-return.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 6: Commit**

```bash
git add src/lib/a11y/focus.ts src/lib/a11y/focus.svelte.ts tests/unit/focus-return.test.ts
git commit -m "feat(a11y): focus-return ladder and opener map (#28)"
```

---

### Task 3: Deep-link resolution and URL patching

**Files:**
- Create: `src/lib/a11y/deep-link.ts`
- Test: `tests/unit/deep-link.test.ts`

**Interfaces:**
- Produces: `PHOTO_PARAM = "photo"`, `readPhotoParam(search: string): string | null`, `withPhotoParam(search: string, photoId: string | null): string`, `resolveDeepLink<T extends { readonly id: string }>(photoId: string | null, cards: readonly T[]): T | null`.
- Consumes: nothing.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { readPhotoParam, resolveDeepLink, withPhotoParam } from "$lib/a11y/deep-link";

const cards = [{ id: "a" }, { id: "b" }] as const;

describe("readPhotoParam", () => {
  it("reads the photo id", () => {
    expect(readPhotoParam("?photo=b")).toBe("b");
  });

  it("returns null for a missing or blank id", () => {
    expect(readPhotoParam("")).toBeNull();
    expect(readPhotoParam("?photo=")).toBeNull();
    expect(readPhotoParam("?photo=%20%20")).toBeNull();
  });
});

describe("withPhotoParam", () => {
  it("preserves unrelated params", () => {
    expect(withPhotoParam("?lang=en", "b")).toBe("?lang=en&photo=b");
  });

  it("removes the param without leaving a stray question mark", () => {
    expect(withPhotoParam("?photo=b", null)).toBe("");
    expect(withPhotoParam("?lang=en&photo=b", null)).toBe("?lang=en");
  });
});

describe("resolveDeepLink", () => {
  it("returns the card for a known id", () => {
    expect(resolveDeepLink("b", cards)).toEqual({ id: "b" });
  });

  it("returns null for an unknown id so no dialog opens", () => {
    expect(resolveDeepLink("missing", cards)).toBeNull();
    expect(resolveDeepLink(null, cards)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project unit tests/unit/deep-link.test.ts`
Expected: FAIL — cannot resolve `$lib/a11y/deep-link`.

- [ ] **Step 3: Implement `src/lib/a11y/deep-link.ts`**

`URLSearchParams` only; `readPhotoParam` trims and maps empty to `null`; `withPhotoParam` returns `""` or `?…`; `resolveDeepLink` is `cards.find(...) ?? null`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --project unit tests/unit/deep-link.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/a11y/deep-link.ts tests/unit/deep-link.test.ts
git commit -m "feat(a11y): deep-link resolution and URL patching (#28)"
```

---

### Task 4: Binder tile with alt text, proven in the browser

**Files:**
- Modify: `src/lib/stores/i18n.svelte.ts` (add the deck keys)
- Create: `src/lib/components/CardTile.svelte`
- Test: `tests/e2e/binder-alt.spec.ts`

**Interfaces:**
- Consumes: `tileAlt` (Task 1), `i18n.format`/`i18n.t`.
- Produces: `CardTile` props `{ model: CardFaceModel; collected: boolean; onactivate: (id: string, origin: HTMLElement) => void }`; root is a `<button class="tile" type="button" data-focus-id={model.id}>`; inner `<img class="tile__photo" alt={alt}>`.

New `MessageKey` rows (copy deck §2, §6.5; DE master):
`catalogue.title`, `catalogue.lede`, `nav.catalogue`, `nav.close.card`, `card.image.alt`, `tile.aria.open`, `tile.aria.open.unseen`, `tile.state.collected`, `tile.state.unseen`.

- [ ] **Step 1: Write the failing test**

`tests/e2e/binder-alt.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test.describe("binder tile text alternatives", () => {
  test("every tile image has a non-empty alt", async ({ page }) => {
    await page.goto("/");
    const alts = await page.locator("#katalog .tile__photo").evaluateAll((images) =>
      images.map((image) => image.getAttribute("alt") ?? ""),
    );
    expect(alts.length).toBeGreaterThan(0);
    for (const alt of alts) expect(alt.trim().length).toBeGreaterThan(0);
  });

  test("every tile's accessible name names the card and its state", async ({ page }) => {
    await page.goto("/");
    const names = await page.locator("#katalog .tile").evaluateAll((tiles) =>
      tiles.map((tile) => tile.getAttribute("aria-label") ?? ""),
    );
    expect(names.length).toBeGreaterThan(0);
    for (const name of names) {
      expect(name).toMatch(/^Karte \d+ öffnen: .+, (gesammelt|noch nicht gesammelt)$/);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run build; npx playwright test --project=chromium tests/e2e/binder-alt.spec.ts`
Expected: FAIL — `#katalog .tile__photo` resolves to 0 elements.

- [ ] **Step 3: Add the i18n keys**

Add the nine rows to both `DE` and `EN` dictionaries and the `MessageKey` union. DE values verbatim from the copy deck; EN likewise. No `!` in any of them.

- [ ] **Step 4: Implement `src/lib/components/CardTile.svelte`**

Button with `aria-label={i18n.format(collected ? "tile.aria.open" : "tile.aria.open.unseen", { number: model.number, name: model.name })}`, `onclick` calling `onactivate(model.id, event.currentTarget)`, image `alt={tileAlt(model.photo, i18n.format("card.image.alt", { name: model.name }))}`, `loading="lazy"`, `decoding="async"`, and the visible name + state word. Scoped CSS uses `.tile*` selectors only and tokens only.

- [ ] **Step 5: Render tiles in `App.svelte`**

Replace the single `CardFace` with a `<section id="katalog">` containing an `<h2>` (`catalogue.title`) and `<ul aria-labelledby>` of `<li><CardTile … /></li>`. Wire `onactivate` to the dialog opener from Task 5; until then capture the opener and open nothing (test still passes because the tile exists).

- [ ] **Step 6: Run test to verify it passes**

Run: `npm run build; npx playwright test --project=chromium tests/e2e/binder-alt.spec.ts`
Expected: PASS, 2 tests.

- [ ] **Step 7: Commit**

```bash
git add src/lib/stores/i18n.svelte.ts src/lib/components/CardTile.svelte src/App.svelte tests/e2e/binder-alt.spec.ts
git commit -m "feat(a11y): binder tiles carry manifest alt and a state-bearing name (#28)"
```

---

### Task 5: Card dialog, focus matrix and the CTA fallback

**Files:**
- Create: `src/lib/components/CardDialog.svelte`
- Modify: `src/App.svelte`
- Test: `tests/e2e/focus-return.spec.ts`

**Interfaces:**
- Consumes: `focusReturn` (Task 2), `readPhotoParam`/`withPhotoParam`/`resolveDeepLink` (Task 3), `CardTile` (Task 4).
- Produces: `CardDialog` props `{ model: CardFaceModel | null; open: boolean; onclosed: () => void }`; renders `<dialog class="card-dialog" tabindex="-1" aria-labelledby={card-title-id}>` with the close control (`nav.close.card`) and `CardFace`.

`App.svelte` adds `#stage` (`tabindex="-1"`) with `#open-pack` — the page’s primary CTA (`nav.catalogue`, “Zur Sammlung”; enters the collection and focuses the first tile). Ruling (recorded in the PR): the pack trigger that owns `#open-pack` in `stage-landing.md` arrives with B3 (#14); until then the binder’s entry control holds that id so ADR-0010 §3 rung 2 is reachable, and the deep-link fallback is a real control rather than `<body>`.

- [ ] **Step 1: Write the failing test**

`tests/e2e/focus-return.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

const activeFocusId = (page: import("@playwright/test").Page) =>
  page.evaluate(() => document.activeElement?.getAttribute("data-focus-id"));

test("close button returns focus to the invoking tile", async ({ page }) => {
  await page.goto("/");
  const tile = page.locator('[data-focus-id="elsa-02"]');
  await tile.click();
  await expect(page.locator("dialog[open]")).toBeVisible();
  await page.getByRole("button", { name: "Diese Karte schließen" }).click();
  await expect(page.locator("dialog[open]")).toHaveCount(0);
  await expect.poll(() => activeFocusId(page)).toBe("elsa-02");
});

test("Escape returns focus to the invoking tile", async ({ page }) => {
  await page.goto("/");
  await page.locator('[data-focus-id="elsa-03"]').focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("dialog[open]")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("dialog[open]")).toHaveCount(0);
  await expect.poll(() => activeFocusId(page)).toBe("elsa-03");
});

test("deep-link close falls back to the CTA, never body", async ({ page }) => {
  await page.goto("/?photo=elsa-02");
  await expect(page.locator("dialog[open]")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect.poll(() => page.evaluate(() => document.activeElement?.id)).toBe("open-pack");
  expect(await page.evaluate(() => document.activeElement === document.body)).toBe(false);
});

test("browser Back closes the dialog and returns focus to the invoking tile", async ({ page }) => {
  await page.goto("/");
  await page.locator('[data-focus-id="elsa-04"]').click();
  await expect(page.locator("dialog[open]")).toBeVisible();
  await page.goBack();
  await expect(page.locator("dialog[open]")).toHaveCount(0);
  await expect.poll(() => activeFocusId(page)).toBe("elsa-04");
});

test("an unknown deep link opens no dialog and leaves the URL alone", async ({ page }) => {
  await page.goto("/?photo=missing");
  await expect(page.locator("dialog[open]")).toHaveCount(0);
  expect(new URL(page.url()).searchParams.get("photo")).toBe("missing");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run build; npx playwright test --project=chromium tests/e2e/focus-return.spec.ts`
Expected: FAIL — no `<dialog>` opens; no `#open-pack`.

- [ ] **Step 3: Implement `CardDialog.svelte`**

`$effect` opens with `showModal()` and focuses the dialog element (`tabindex="-1"`), closes when `open` goes false; `onclose` calls `onclosed`. Close control labelled `nav.close.card`. Class names `.card-dialog*` only.

- [ ] **Step 4: Wire `App.svelte`**

- `selectedId = $state<string | null>(null)`; `selected = $derived(fixtures.find((c) => c.id === selectedId) ?? null)`.
- Tile activation: `focusReturn.capture("card", origin)`, `collection.markSeen(id)`, `selectedId = id`, `history.pushState({}, "", withPhotoParam(location.search, id))`.
- `onclosed`: `selectedId = null`; `history.replaceState({}, "", withPhotoParam(location.search, null))`; `queueMicrotask(() => focusReturn.restore("card"))`.
- `onMount`: `collection.setTotal(fixtures.length)`; deep link `resolveDeepLink(readPhotoParam(location.search), fixtures)` → if found `focusReturn.capture("card", null)` and set `selectedId` (no push); if unknown, do nothing.
- `svelte:window on:popstate` → when the URL has no `photo` and a dialog is open, `selectedId = null`.
- `#open-pack` (`nav.catalogue`) click → scroll `#katalog` into view and focus the first `[data-focus-id]` tile.

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run build; npx playwright test --project=chromium tests/e2e/focus-return.spec.ts`
Expected: PASS, 5 tests.

- [ ] **Step 6: Commit**

```bash
git add src/lib/components/CardDialog.svelte src/App.svelte tests/e2e/focus-return.spec.ts
git commit -m "feat(a11y): card dialog returns focus to its invoker; deep links land on the CTA (#28)"
```

---

### Task 6: Gates, proof and the PR

**Files:**
- Modify: none (verification only)

- [ ] **Step 1: Run the full gate set**

Run: `npm run verify`
Expected: exit 0. Any pre-existing red (canon baseline #31, Windows-only unit failures) is recorded by name in the PR body; no new failure.

- [ ] **Step 2: Run the new suites explicitly and paste the output**

Run: `npx vitest run --project unit tests/unit/tile-alt.test.ts tests/unit/focus-return.test.ts tests/unit/deep-link.test.ts`
Run: `npm run build; npx playwright test --project=chromium tests/e2e/binder-alt.spec.ts tests/e2e/focus-return.spec.ts`

- [ ] **Step 3: Commit any gate fix, push and open the PR**

```bash
git push -u origin fix/m6-alt-text-focus
gh pr create --base main --head fix/m6-alt-text-focus \
  --title "fix(a11y): binder alt text + focus return (#28)" \
  --body "Closes #28 …"
```

Request `cs-accessibility-engineer` cross-check. Do not merge.
