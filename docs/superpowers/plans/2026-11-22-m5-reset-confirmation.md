# M5 — Reset confirmation (a11y Critical) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make "Von vorn / Start over" unable to destroy anything without an explicit, accessible confirmation that names the full loss, and clear every `lucky-elsa.*` key only after that confirmation.

**Architecture:** A `PersistenceStore` owns the one enumeration that wipes the `lucky-elsa.*` namespace; a `ResetConfirmDialog` wraps a native `<dialog role="alertdialog">` opened by a quiet trigger and returns focus through one focus manager; one announcer writes the single post-reset line into the pre-mounted polite region. Cancel is the default focus and performs zero writes. Nothing in a component touches `localStorage`.

**Tech Stack:** Svelte 5.59 runes, TypeScript 7 (strict), Panda CSS tokens (`--elsa-*`), Vitest 5 (node), Playwright 1.65, native `<dialog>`.

**Spec:** `docs/audits/a11y-baseline.md` C1; `design/copy/copy-deck.md` §9 + §8 (`live.reset.done`); `design/ux/interaction-patterns.md` "Reset with Confirmation" + "Focus Trap (Dialog)"; `docs/adr/ADR-0003-state-persistence.md` §5; `docs/adr/ADR-0010-accessibility-runtime.md` §1–§3; `docs/test-plan.md` §5.4, §6.9, E-FOC-10/11/16.

**Closes #27 · Branch `fix/m5-reset-confirmation` · Base `6b9c50a`**

## Global Constraints

- Canon: Die Sammlung / The Collection; verb gesammelt / collected; **no** Katalog/Catalogue naming the collection, no "Heft", no water vocabulary; at most one `!` per surface and **never** in a destructive, error or announced string.
- Copy is SSoT in `design/copy/copy-deck.md`; `reset.body` is byte-identical to the deck row (DE 137 / EN 124 chars, cap 140) and is read in full by a screen reader.
- Accessibility tier **Standard**: 4.5:1 text, 3:1 focus ring, 44 px targets, visible focus, focus return after every close, announcements in the current language, `prefers-reduced-motion` honoured.
- `src/App.svelte` is the only `role="status"` / `role="alert"` site (ADR-0010 §1). Components call `announcer.say`, never a region.
- Only `src/lib/io/persistence.svelte.ts` may import `localStorage` (architecture layer rule).
- Scoped CSS consumes tokens only (`var(--elsa-*)`); no raw colour, length or opacity; every selector unique across files (selector-diff gate); every class used (unused-CSS gate).
- No new runtime dependency. Node 26 / npm 11.

## Review Focus

- **Cancel must write nothing at all** — Escape, Cancel, and a backdrop click leave `localStorage` byte-identical (deep compare). A pre-emptive write "so the state is consistent" is the failure.
- **A second reset in one session must still be announced** — the announcer blanks then rewrites identical text; a single write is silent to screen readers.
- **The wiped key set is a prefix, not an allowlist** — legacy and unknown `lucky-elsa.*` keys clear; foreign origin keys survive.
- **Focus never lands on `<body>`** — after confirm the dialog is gone, so the ladder must fall through to `#open-pack`, then `#stage` (which is `tabindex="-1"`).
- **Storage unavailable is not a silent no-op** — the trigger is disabled and described, and the reason is a deck key, not a runtime string.

---

### Task 1: Copy keys, deck row and registry row

**Files:**
- Modify: `src/lib/stores/i18n.svelte.ts`
- Modify: `design/copy/copy-deck.md` (§9 row `reset.unavailable`)
- Modify: `design/registry/entities.yaml` (`copy_keys` → `reset`)
- Test: `tests/unit/i18n-reset.test.ts` (create)

**Interfaces:**
- Produces: `MessageKey` gains `"reset.trigger" | "reset.title" | "reset.body" | "reset.confirm" | "reset.cancel" | "reset.unavailable" | "live.reset.done"`; `i18n.t(key)` returns the deck string in the active locale.

- [ ] **Step 1: Write the failing drift test**

```ts
// tests/unit/i18n-reset.test.ts — extracts the deck §9 rows and compares them to DICTIONARIES
const RESET_KEYS = ["reset.trigger", "reset.title", "reset.body", "reset.confirm", "reset.cancel", "reset.unavailable"] as const;
it("matches the deck's reset rows byte for byte", () => {
  const deck = deckRows(); // Map<key, { de, en }>
  for (const key of RESET_KEYS) {
    expect(DICTIONARIES.de[key]).toBe(deck.get(key)?.de);
    expect(DICTIONARIES.en[key]).toBe(deck.get(key)?.en);
  }
});
it("keeps reset.body inside its cap and free of exclamation marks", () => { /* <=140, no "!" for every reset key */ });
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm run test:unit -- tests/unit/i18n-reset.test.ts`
Expected: FAIL — `reset.trigger` is missing from the DE dictionary.

- [ ] **Step 3: Add the keys and the one new deck row**

`reset.body` DE/EN are pasted from the deck with the em dash (—), not a hyphen. `reset.unavailable` is the only new string: DE "Dieses Gerät kann gerade nichts speichern. Von vorn bleibt gesperrt." / EN "This device cannot save right now. Starting over stays locked." (E-RST-08). Add it to deck §9 (max 80) and to the registry's `reset` copy-key group.

- [ ] **Step 4: Verify green**

Run: `npm run test:unit -- tests/unit/i18n-reset.test.ts && npm run canon && npm run gate:tables`
Expected: PASS, canon clean, tables clean.

- [ ] **Step 5: Commit**

```bash
git add src/lib/stores/i18n.svelte.ts design/copy/copy-deck.md design/registry/entities.yaml tests/unit/i18n-reset.test.ts
git commit -m "feat(copy): reset confirmation strings (#27)"
```

---

### Task 2: Persistence wipe and availability

**Files:**
- Create: `src/lib/io/persistence.svelte.ts`
- Test: `tests/unit/persistence.test.ts` (create)

**Interfaces:**
- Produces: `STORAGE_PREFIX = "lucky-elsa."`; `StorageLike`; `class PersistenceStore { constructor(backend?: StorageLike | null); get available(): boolean; wipe(): number }`; singleton `persistence`.

- [ ] **Step 1: Write the failing tests**

```ts
class FakeStorage implements StorageLike { /* Map-backed, records removeItem calls, can throw */ }
it("wipe removes every lucky-elsa.* key and nothing else", () => {
  seed 3 registered + 4 stale + 2 foreign; expect(store.wipe()).toBe(7); expect(foreign keys still there)
});
it("wipe is idempotent", () => expect(store.wipe()).toBe(0));
it("wipe survives a rejecting removeItem", () => /* returns the count that succeeded, does not throw */);
it("available is false without a backend and true for a working one, leaving no probe key", () => {});
it("available is false when the probe write throws", () => {});
```

- [ ] **Step 2: Run and watch it fail**

Run: `npm run test:unit -- tests/unit/persistence.test.ts`
Expected: FAIL — cannot resolve `$lib/io/persistence.svelte`.

- [ ] **Step 3: Implement `PersistenceStore`**

`wipe()` collects `key(i)` for `i < length` starting with `STORAGE_PREFIX` into an array first (removal mutates indices), then removes each inside `try`, counting successes. `available` probes once (set + remove of `${STORAGE_PREFIX}probe.v1`) and caches; a missing backend or a throwing probe is `false`. Every write path is `try`-wrapped: the app must run with storage unavailable.

- [ ] **Step 4: Verify green**

Run: `npm run test:unit -- tests/unit/persistence.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/io/persistence.svelte.ts tests/unit/persistence.test.ts
git commit -m "feat(reset): persistence wipe over the lucky-elsa namespace (#27)"
```

---

### Task 3: Announcer (one polite region, replacing writes)

**Files:**
- Create: `src/lib/a11y/announcer.svelte.ts`
- Test: `tests/unit/announcer.test.ts` (create)

**Interfaces:**
- Produces: `class AnnouncerStore { constructor(resolve?: () => HTMLElement | null); say(message: string): void }`; singleton `announcer` resolving `#live-status`.

- [ ] **Step 1: Write the failing tests**

```ts
const region = fakeRegion(); // counts textContent writes
it("writes the message into the polite region", () => { say("Von vorn."); expect(region.textContent).toBe("Von vorn.") });
it("blanks and rewrites an identical message so it is announced twice", () => { say("x."); say("x."); expect(region.writes).toBe(3) });
it("never lets an exclamation mark reach the region", () => { say("Neu!"); expect(region.textContent).toBe("Neu.") });
it("is a no-op without a region", () => { expect(() => new AnnouncerStore(() => null).say("x")).not.toThrow() });
```

- [ ] **Step 2: Run and watch it fail** — module missing.

- [ ] **Step 3: Implement**

`say` renders `message.replace(/!\s*$/, ".")`, writes through, and when the incoming text equals the current text writes `""` first and rewrites on `requestAnimationFrame` (falling back to a synchronous rewrite when `requestAnimationFrame` is absent, so the node tests are honest). No queue, no timer, no `role` creation.

- [ ] **Step 4: Verify green** — `npm run test:unit -- tests/unit/announcer.test.ts`

- [ ] **Step 5: Commit** — `git commit -m "feat(a11y): polite announcer for the reset line (#27)"`

---

### Task 4: Reset orchestration

**Files:**
- Create: `src/lib/stores/reset.ts`
- Test: `tests/unit/reset.test.ts` (create)

**Interfaces:**
- Produces: `interface ResetPorts { wipe(): number; resetCollection(): void; resetPreferences(): void; translate(key: "live.reset.done"): string; announce(message: string): void }`; `performReset(ports?: ResetPorts): { clearedKeys: number; announcement: string }`; `defaultResetPorts`.

- [ ] **Step 1: Write the failing tests**

```ts
it("wipes before it announces", () => { performReset(recordingPorts()); expect(order).toEqual(["wipe", "resetCollection", "resetPreferences", "announce"]) });
it("resets collection and preferences even when nothing was stored", () => { wipe → 0; expect both still called });
it("announces the deck line exactly once", () => { expect(announce).toHaveBeenCalledTimes(1) });
it("announces the German line after preferences return to default", () => { expect(announcement).toBe("Von vorn. Alle Karten können wieder kommen.") });
```

- [ ] **Step 2: Run and watch it fail.**

- [ ] **Step 3: Implement** `performReset` in that order; `defaultResetPorts` wires `persistence.wipe`, `collection.reset`, `audio.setMuted(true)` + `i18n.setLocale("de")`, `i18n.t` and `announcer.say`. No Reactivity here — this file is a plain module.

- [ ] **Step 4: Verify green.**

- [ ] **Step 5: Commit** — `git commit -m "feat(reset): confirmed reset orchestration (#27)"`

---

### Task 5: Focus manager, dialog and the shell

**Files:**
- Create: `src/lib/a11y/focus.svelte.ts`
- Create: `src/lib/components/ResetConfirmDialog.svelte`
- Modify: `src/App.svelte` (live regions, `#stage`, tools row)
- Modify: `design/tokens/tokens.ts` (`sizes.target: 44px`)
- Test: `tests/e2e/reset.spec.ts` (create) — written before the component

**Interfaces:**
- Produces: `type SurfaceId = "reset"`; `captureOpener(surface, el | null): void`; `restoreFocus(surface, fallbacks?: readonly (() => HTMLElement | null)[]): void`.
- Consumes: `performReset`, `persistence.available`, `i18n`.

- [ ] **Step 1: Write the failing Playwright spec**

Assertions: E-RST-01 (trigger opens a dialog, storage deep-compare unchanged), E-RST-02 (`document.activeElement` is Cancel), E-RST-03 (body equals the DE `reset.body`, includes "Ton und Sprache"), E-RST-04 (Escape and backdrop close with zero writes), E-RST-05 (confirm empties every `lucky-elsa.*` key and writes the line once into `#live-status`), E-RST-07 (reload stays reset), E-RST-09 (`R` does nothing), E-RST-10 (`dialog[open][role="alertdialog"]` with `aria-labelledby`/`aria-describedby`), E-FOC-10/11 (focus back on the trigger), Tab cycles inside the dialog, and reduced motion leaves no open animation.

- [ ] **Step 2: Run it and watch it fail**

Run: `npm run build && npx playwright test tests/e2e/reset.spec.ts --project=chromium`
Expected: FAIL — no reset trigger exists.

- [ ] **Step 3: Implement focus, dialog and shell**

`captureOpener` stores the element; `restoreFocus` validates a candidate (connected, not disabled, no `[inert]` ancestor, has client rects) and focuses the first valid one in a microtask, ladder = opener → `#open-pack` → `#stage`. The dialog uses `showModal()`, focuses Cancel on open, closes on Cancel / `Escape` / backdrop `click` where `event.target === dialog`, and on `close` calls `restoreFocus("reset", […])`. Confirm closes, then `performReset()`. App mounts `#live-status` / `#live-alert` empty and clipped before `<main id="stage" tabindex="-1">` and renders the trigger in a tools row.

- [ ] **Step 4: Verify green** — rerun Step 2; then `npm run check:ts && npm run check && npm run lint`.

- [ ] **Step 5: Commit** — `git commit -m "feat(reset): accessible reset confirmation dialog (#27)"`

---

### Task 6: Gates, evidence, PR

- [ ] `npm run verify` — every enforced gate green; the two known baseline failures (canon 128-line baseline, Windows-only unit failures) named, not regressed.
- [ ] `npx playwright test tests/e2e/reset.spec.ts --project=chromium --project=webkit` evidence pasted.
- [ ] VoiceOver: **NOT ASSESSED** here (no macOS) — recorded for the `cs-accessibility-engineer` cross-check.
- [ ] Push, open the PR with the merge gate in the body and `Closes #27`, request the cross-check.
