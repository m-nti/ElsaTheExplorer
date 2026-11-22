# Accessibility baseline audit — current app (pre-refactor)

> **Status**: Baseline audit, complete for the committed Standard tier
> **Auditor**: `cs-accessibility-engineer`
> **Date**: 2026-11-22
> **Scope**: the current, pre-refactor app at project root (`index.html`, `assets/js/app.js`, `assets/js/card-bank.js`, `assets/css/style.css`, `assets/css/cards.css`, `photos.php`, `photos.json`), served at `http://127.0.0.1:4181`
> **Audited against**: `design/accessibility-requirements.md` — **Standard tier, WCAG 2.2 AA**, committed 2026-11-22
> **Not audited**: the Svelte 5 refactor (does not exist yet). `design/ux/interaction-patterns.md` is referenced only where it states a commitment the current app already violates.
> **Method**: source review + dependency-free computed-contrast measurement + headless-Chrome probes of the running app (puppeteer-core, already a devDependency — **no dependency was added**)

---

## 1. Verdict

**The current app does not meet the committed Standard tier.** 1 Critical, 10 Major and 18 Minor findings.

The tier's costliest gaps are not exotic: one destructive action with no confirmation, five persistent hint/footer strings below 4.5:1, no text alternative for the photographs at the level where the collection is browsed, an unstoppable ambient animation under `prefers-reduced-motion`, and a modal keyboard model that drops focus and hijacks a letter key. Everything the tier calls "Built — verify" was verifiable and mostly holds: landmarks, heading order, the language switch, visible focus, the progressbar role, the no-color-only rarity backup, and reduced-motion content parity are genuinely implemented.

Two claims in the requirements document are **not true of the code** and should be corrected when the doc is next revised:

- `design/accessibility-requirements.md:123` — the seen/unseen **"gesehen / seen" text tag on the tile** does not exist. `seenTag` (`app.js:56`, `app.js:141`) is dead copy; no CSS or DOM carries a visual seen state. The only carriers are the screen-reader accessible name and the numeric progress line.
- `design/accessibility-requirements.md:160` — the progress line is **not** "repeated in the pack dialog". `dialogProgress`, `dialogProgressAll` and `packProgressDefault` are unused strings.

---

## 2. Method, environment and tooling gaps

### 2.1 What was executed

| Step | Tool | Result |
|------|------|--------|
| Source review | Read `index.html`, `assets/js/app.js`, `assets/css/style.css`, `assets/css/cards.css` end to end, plus the card-bank data that carries rendered text (`assets/js/card-bank.js`: lines, names, moods, traits, rarity labels) | Finding IDs below cite exact lines |
| Contrast | Purpose-written WCAG 2.x relative-luminance script (no library) — token pairs, alpha compositing, and **pixel sampling of the rendered backdrop** from headless screenshots | §6 |
| Runtime structure | `puppeteer-core` + installed Chrome, viewports 320/390/414/768/1024/1280/1920 | §7, §8 |
| Keyboard/focus | Same, tab-order capture, dialog open/close, `P`/`F`/arrows/Escape, skip link, `:focus-visible` computed outlines | §8 |
| Reduced motion | Same, `emulateMediaFeatures(prefers-reduced-motion: reduce)`, canvas `toDataURL` diff, transform-matrix diff | §8 |
| Accessibility tree | Chrome AX tree via `page.accessibility.snapshot()` | §5 (m1) |
| Broken-image path | Live probe: repointed a card `<img>` at a 404 with `data-heic="false"` | §4 (M7) |

### 2.2 Tooling gap — declared a11y skill is absent

My agent definition points at `../../engineering/a11y-audit/` (`a11y_scanner.py`, `contrast_checker.py`, `references/wcag-guidelines.md`). **That directory does not exist in this repository**, and the framework has no installed a11y skill (only the `/a11y-audit` command at `~/.config/opencode/commands/a11y-audit.md`). Consequences:

- No third-party scanner (axe/pa11y) was run. Structural findings come from source + AX-tree inspection, not from a rule engine; a rule engine may surface additional low-severity violations.
- No `axe`/Lighthouse numbers are quoted anywhere in this report.
- Contrast was measured with an explicit, reproducible script rather than a named tool. The ratios in §6 are the record for this audit; re-measure with the project's Vitest gate once `tokens.ts` exists.

### 2.3 Skills activated (standing rule)

Read and applied: **`code-review`** (source-level audit discipline), **`qa-plan`** (test-method framing for the commitment table), **`ux-review`** (validation against the committed a11y tier and `design/ux/interaction-patterns.md`), **`test-evidence-review`** (evidence-over-existence; every verdict below names its evidence, and absence of evidence is reported as `NOT ASSESSED`, never as a pass). Also applied the global `/a11y-audit` command's violation taxonomy and severity ladder.

---

## 3. Critical findings

### C1 — Reset wipes the collection with one activation, no confirmation, no undo

**Files**: `assets/js/app.js:1095-1102` (`resetLap`), `index.html:144` (`#reset-lap`), `assets/js/app.js:306`

```js
function resetLap() {
  if (!state.photos.length) return;
  state.seen.clear();
  writeStorage(STORAGE.seen, []);
  updateProgress();
  renderBinder();
  announce(t("restartAnnounce"));
}
```

**Evidence**: probe at 1280×900 with 10 cards already marked seen — a single click on "Von vorn" cleared them with no dialog and no second step; the only feedback was the post-hoc `#live` message "Von vorn. Alle Karten können wieder kommen." (an announcement of what was already destroyed, not a confirmation). The control sits 16 px from the album count (`style.css:527`), and the handler is viewport-independent (`app.js:306`).

**Why Critical**: irreversible loss of the visitor's only progress (the pack lap), triggered by a single discrete activation, adjacent to a non-destructive count. `design/accessibility-requirements.md:159` already declares this **"the one BLOCKING cognitive finding"**; this audit confirms it is still present. `design/ux/interaction-patterns.md:210,440` specifies a confirm dialog with **Cancel as the default focus**.

**Fix**: native `<dialog>` confirmation ("Von vorn beginnen? N Karten werden als gesehen gelöscht."), Cancel focused on open, Escape cancels, confirm announces what was cleared. Never a one-tap wipe.

---

## 4. Major findings

### M1 — `--quiet` text fails 4.5:1 everywhere it is used (measured)

**Files**: `assets/css/style.css:17` (token), `:309` (`.progress__note`, `.stage__hint`), `:513` (`.pack-dialog__hint`), `:563` (`.print__hint`), `:537` (`.colophon__line`); copy in `index.html:104,107,190,212,160`

**Measured** (text `#756e7d`, 11–12 px; backdrops sampled from rendered pixels immediately beside each string, 1280×900; method validated by a control sample inside the opaque `.colophon`, which returned its token `#100f15` exactly):

| String | Size | Rendered backdrop | Ratio | Required |
|--------|------|-------------------|-------|----------|
| `.progress__note` | 11 px | `rgb(21,19,25)` | **3.76:1** | 4.5 |
| `.stage__hint` (`P` instructions) | 11 px | `rgb(22,20,26)` | **3.73:1** | 4.5 |
| `.pack-dialog__hint` | 11 px | `rgb(6,6,10)` | **4.13:1** | 4.5 |
| `.print__hint` (`←`/`→` instructions) | 11 px | `rgb(30,26,38)` | **3.48:1** | 4.5 |
| `.colophon__line` | 12 px | `rgb(16,15,21)` | **3.89:1** | 4.5 |

Token-only pairs for comparison: `--quiet` on `--bg` 3.86:1, on `--surface` 3.36:1, on the lightbox gradient 3.52–3.82:1. The rendered backdrop differs from the raw token in **both directions**: the stage sits over the body's radial glows (`style.css:844-849`, up to `rgb(115 93 137 / 14%)`) and the `body::before` noise texture (`:70-80`, `:851`), which lighten it to `rgb(21,19,25)`; the pack dialog's transparent inner over a 90 % backdrop-darkened page darkens its hint to `rgb(6,6,10)`; the card dialog's own gradient lightens `.print__hint` to `rgb(30,26,38)`. The token pair alone is therefore not a safe stand-in — any fix must measure the composed backdrop.

**Why Major**: two of these five strings carry the **only** keyboard instructions (`P`, `←`/`→`), which the requirements doc explicitly says "must stay legible" (`:108`). WCAG 1.4.3 failure on persistent text.

**Fix**: promote every `--quiet` string to `--muted` (7.53–7.74:1 measured) or darken the token until the **composed** backdrop passes; then add a Vitest gate that computes ratios over the composited background (background + glow + noise), not just `token:on(bg)`.

### M2 — The pack dialog's close button is disabled during the reveal, so mouse/touch users cannot skip it

**Files**: `assets/js/app.js:971-977` (`setBusy` disables `els.closePack`), called from `:911`; `index.html:172`

**Evidence**: probe — 100 ms after activating "Pack öffnen", `#close-pack-dialog.disabled === true`, and it stays true until the reveal finishes (~2.4 s: 900 ms sachet + 5 × 200 ms stagger + 520 ms settle, `app.js:921-943`). The button remains visible and labelled "Pack schließen", so it looks actionable and does nothing.

**Why Major**: `design/ux/interaction-patterns.md:176,192,252` commits "✕ and Escape stay live" as the deliberate skip path; `design/accessibility-requirements.md:147` relies on Escape *and* a close button. Keyboard users can still Escape; pointer/touch users are locked into an animation they may need to skip (motion sensitivity, vestibular, impatience, low-end device). It also directly causes M3.

**Fix**: never disable the close control. During the reveal only the pack trigger is busy; ✕ and Escape perform the skip bookkeeping (stop timers and audio, mark already-revealed cards, discard the rest).

### M3 — Focus falls to `<body>` whenever the controls are disabled at close time

**Files**: `assets/js/app.js:971-977`, `assets/js/app.js:314-316`

```js
els.packDialog.addEventListener("close", () => {
  window.setTimeout(() => els.openPack.focus({ preventScroll: true }), 0);
});
```

**Evidence**: probe — opening the pack then pressing `Escape` inside the ~2.4 s reveal window leaves `document.activeElement === body`. Reason: `setBusy(true)` has disabled `#open-pack`, and focusing a disabled button is a no-op. Reproduced exactly (`active after Esc: body`). The same happens after a `P`-triggered re-open (M5).

**Why Major**: focus is lost mid-task; screen-reader and keyboard users are returned to the top of the document with no announcement. WCAG 2.4.3 / 2.4.7 contextual.

**Fix**: compute the return target first, then enable/disable controls, then focus. Disabling an element that may hold focus requires moving focus before the disable.

### M4 — Closing the card dialog does not return focus to the card that opened it

**Files**: `assets/js/app.js:1021-1033`

```js
const packCard = previous && els.packDialog.open ? /* matching drop card */ : null;
(packCard || (els.packDialog.open ? els.closePack : els.openPack)).focus(...)
```

**Evidence**: probe — opened the first binder tile (`data-photo-id="233a150f-…"`), pressed Escape, focus landed on `#open-pack` at the top of the page, not on the tile. This is listed as an Open Question in the requirements (`:297`) and specified the other way in `design/ux/interaction-patterns.md:179,210` ("focus returns to the exact card in the haul that opened it… else the stage trigger").

**Why Major**: in a 10-card (and eventually 200+) binder grid, losing the row means the visitor must traverse the whole grid again. WCAG 2.4.3.

**Fix**: capture `document.activeElement` (or the `data-photo-id`) at open time and restore to it if it is still connected; fall back to the pack close button, then the stage trigger.

### M5 — The `P` shortcut fires inside the open pack dialog and destroys the modal's own state

**Files**: `assets/js/app.js:1199-1223` — the dialog branch only checks `els.dialog` (the card dialog); `#pack-dialog` is never consulted before `openPack()`

**Evidence**: probe — with the pack dialog open and focus on its close button, pressing `P` immediately produced `#live` = "Das Pack geht auf." and `#close-pack-dialog.disabled === true`; i.e. a second pack render replaced the first *inside* the open modal and disabled the focused control. Escape afterwards dropped focus to `<body>` (M3).

**Why Major**:
1. **WCAG 2.1.4 (AA)** — a single-character shortcut must offer remap, turn-off, or be active only on focus. `P` is document-wide, unmodified, with no off switch. The requirements doc's claim that the guard makes this safe (`:139`) addresses modifier collisions, not 2.1.4.
2. It re-enters a modal and silently discards the revealed pack — a state change the visitor did not ask for.
3. It is the trigger for the focus loss in M3.

`F` inside the card dialog is the same pattern but is at least modal-scoped; still, prefer binding it to the card element (the component with focus) rather than `document`. Add `aria-keyshortcuts` to the controls that own the shortcut.

**Fix**: `if (els.packDialog.open) return;` before the `P` branch, plus one 2.1.4 remedy (a "Tastenkürzel" toggle in settings, or require a modifier, or gate it behind a visible "shortcuts on" state). Never fire a global shortcut while any modal is open.

### M6 — The photographs have no text alternative where the collection is browsed

**Files**: `assets/js/app.js:807-815` (`image.alt = "";` for every card image), `:753-773` (tile accessible name), manifest `photos.json` (rich bilingual `alt` per photo), `photos.php` (same field)

**Evidence**: probe counts **12 images on the page, 0 with non-empty `alt`**. The manifest supplies, e.g., `alt.de` = "Elsa schläft zusammengerollt auf einer grünen Decke." / `alt.en` = "Elsa is curled up asleep on a green duvet." That text reaches only the **full card's** `aria-label` (`app.js:762-770`, prefix "Im Bild:"). A binder tile's name is `Karte 03 öffnen: Deckenhöhlen-Späherin` — the photograph itself is never described.

**Why Major**: the product is a photo collection; the photos are the content, not decoration. Empty `alt` is correct for the pack seal preview (`index.html:114,182`, inside `aria-hidden` art) but not for the card art. WCAG 1.1.1: the alternative is available only after an extra interaction, and cannot be skimmed at browsing level. (Counter-argument, recorded honestly: the image sits inside a labelled button, so a strict 1.1.1 reading allows `alt=""` if the button name is equivalent. It is not equivalent here — it names the fictional card, not the photo — and the data for a proper alternative already exists.)

**Fix**: either set `alt` from the manifest on tiles/drop cards (the button name then needs the fictional name kept separate, e.g. `aria-labelledby` on the visible name plus `aria-describedby` on the alt), or append the alt to the tile name. Keep one description per card in the a11y tree, not both.

### M7 — A failed image (HEIC decode failure **or** any 404) leaves an empty frame with no text and no announcement

**Files**: `assets/js/app.js:1134-1157` (`convertHeicImage`), `:346-351` (error listener handles **only** `data-heic="true"`), `:807-815` (no `onerror`, no fallback node)

**Evidence**: probe — repointed a full-card `<img>` to `photos/definitely-missing.jpg`: `naturalWidth: 0`, `alt: ""`, `#live` unchanged ("Nr. 01. Abgemeldet auf Grün. Häufig."), card accessible name unchanged, and **no fallback text node** exists in `.card__photo`. In the HEIC branch the catch block only sets `data-heic-done` and leaves the broken image (`:1152-1156`) — the same empty frame, silently.

**Why Major**: `design/accessibility-requirements.md:227` commits "Broken/failed HEIC decode must degrade to the readable frame, not an empty card (PRD R7)". It does not. Sighted users see the card frame's grey `background: #302b35` (`cards.css:162`) with nothing in it; screen-reader users get a card whose description claims a photo that is not there. WCAG 1.1.1 and 4.1.3.

**Fix**: a shared `<figure>`-style fallback — visible bilingual "Foto nicht verfügbar / Photo unavailable" inside the photo window, the card's text still readable, and one `aria-live` announcement per failure (deduplicated). Wire a global `error` handler for **all** card images, not just HEIC.

### M8 — `prefers-reduced-motion` is not honoured: motes keep animating and pointer tilt still moves the card

**Files**: `assets/js/app.js:1733-1762` (mote loop; `globalAlpha` uses `Math.sin(elapsed …)` at `:1754` and `requestAnimationFrame` re-arms at `:1761` unconditionally), `:1534-1654` (`bindCardShine`; only the *idle* drift is gated at `:1585-1592`; the spring at `:1594-1627` still writes `transform` on every pointer move), `assets/css/style.css:295,330` (hover lifts), `assets/css/cards.css:306`

**Evidence** (both measured, not inferred):

1. Motes: with `prefers-reduced-motion: reduce` matching, `#ambient-motes.toDataURL()` **changed** over a 500 ms window → the canvas is still being drawn and its alpha still pulses. The only thing reduce-motion stops is position drift.
2. Card tilt: with reduce active, moving the pointer from 20 %/25 % to 85 %/80 % of a tile produced two different computed matrices (`matrix3d(0.984381, …)` → `matrix3d(0.980029, …)`) — the spring still follows the pointer. Control run at `no-preference` behaves the same, which proves the probe is sound.
3. Hover transforms (`.button:hover` `translateY(-1px)`, `.pack__seal:hover` `translateY(-7px) rotate(0)`) are applied instantly rather than removed; the CSS kill-switch only shortens durations (`style.css:643`).

**Why Major**: the Standard tier commits "`prefers-reduced-motion` honoured **everywhere**" and the requirement row explicitly says "Verify every animation is actually covered, including the pointer-driven foil layers" (`design/accessibility-requirements.md:111`). Two of the listed sources are still live. The continuous rAF loop is also a battery/CPU cost on a page that claims to be quiet.

Content parity is unaffected: all five cards appear synchronously (`app.js:925-929`), the sachet is hidden, confetti returns early. That part passes.

**Fix**: in reduce mode, render one static mote frame and cancel the loop; skip the spring integrator entirely (no per-frame custom properties); replace hover lifts with an opacity/colour step. Add a Playwright assertion: with reduced motion, `#ambient-motes` pixels are stable and a card's computed transform does not change between two pointer positions.

### M9 — 11 distinct controls measure below the committed 44 px target

**Files**: `style.css:187-199` (`.lang-switch__button` 38×32, `:613` 34 wide ≤420 px), `:202-216` + `:577` (`.sound-toggle` 88×40, 40×40 mobile), `:676-687` + `:830` (`.lightbox__close` **36×36**, 32×32 at short heights), `:708`, `:816`, `:832` (`.lightbox__actions .button` 42 / 38 / 34 high), `:173-179` (`.nav-link` 74×20), `:302` (`.text-link` 130×20 / 120×18), `:154-164` (`.wordmark` 75×26 / 67×23)

**Measured in four states** (390×844 page, 390×844 with each dialog open, 1280×900 with each dialog open): 11 distinct controls fail, reproduced across viewports.

| Control | Measured | Widths where measured |
|---------|----------|-----------------------|
| `.lightbox__close` (card dialog) | **36 × 36** | 390 and 1280 (32×32 at ≤700 px height) |
| `#open-another` / `#save-card` / `#share-card` | 309×38 / 151×38 / 151×38 | 390 |
| same, desktop side column | 136×**42** | 1280 |
| `.lang-switch__button` | 34×32 / 38×32 | 390 / 1280 |
| `#sound-toggle` | 40×40 / 88×40 | 390 / 1280 |
| `.wordmark` | 67×23 / 75×26 | 390 / 1280 |
| `.nav-link` | 74×20 (hidden ≤760) | 1280 |
| `.text-link` "Sammelheft ansehen" / "Nach oben" | 120×18 / 60×18 | 390 |

Passing: `.button--primary` 48 high, `.pack__seal` 459×579, `#reset-lap` 98×48, all binder tiles 172×292, pack-dialog close 44×44 (the `:458` rule beats the later `:676` override), skip link 157×46.

**Why Major**: `design/accessibility-requirements.md:146` marks this "Needs audit" and the UX spec (`interaction-patterns.md:153,343`) requires **44×44** for the lightbox controls and chevrons. Two separate problems: the committed 44 px is missed by the card-dialog close and the action row; and the 18–26 px standalone links are also at risk of WCAG **2.5.8 (24 px)**, which only exempts targets inside a sentence — these are not in a sentence, so they rely on the spacing exception, which is not established at every breakpoint.

Also note the requirement document still says `lightbox__close` is 42 px (`:146,296`); the shipped rule chain makes it 36 px.

**Fix**: one `--target: 44px` token applied to every control (the project already has `--space-*`); for inline links use a padded hit area (`::after { inset: -12px }` or `padding-block`). Keep the 44 px even at `max-height: 700px` — shrinking controls to fit a short viewport trades the target for a layout that can scroll.

### M10 — Live-region coverage has holes the requirements doc does not admit

**Files**: `index.html:217` (`#live`), `:211` (`#share-status`), `assets/js/app.js:1673-1678` (`announce`), `:1104-1132` (`renderEmpty`), `:1134-1157` (HEIC), `:1095-1102` (reset)

**Announced (verified)**: pack opening, the full pack list with names, per-card open ("Nr. 01. Name. Häufig."), flip front/back, auto-restart when the lap completes, manual reset (**after** the wipe), language switch (in the new language), share success/failure.

**Not announced**: the empty collection state (the binder's "Noch keine Karten…" replaces the loading placeholder silently), any image failure or HEIC conversion result (M7), and the reset has no *confirming* announcement before the data is gone (C1).

**Also**: the requirements doc says the pack flow includes "per-card reveal" announcements (`:66,191`); the implementation announces the pack **once, at the end** (`app.js:948-951`). That is arguably the better design — recorded as a deviation from the written commitment, not as a defect.

**Why Major**: the empty state is the documented screen-reader check for the photos pipeline (`:227`), and a failed image is currently silent for everyone (M7).

**Fix**: `aria-atomic="true"` on `#live`; announce empty state, image failures (deduplicated), and the reset confirmation; keep the pack list as a single announcement and update the doc to match.

---

## 5. Minor findings

| ID | Finding | File:line | Evidence / note | SC |
|----|---------|-----------|-----------------|----|
| m1 | The `<header>` inside the pack `<dialog>` exposes **role=banner inside the dialog** | `index.html:167` | AX tree: `dialog: Dein Pack → banner → heading`. No duplicate banner is exposed (the modal prunes the page), so this is semantics, not a duplicated landmark | 1.3.1 |
| m2 | Skip link target is not focusable; Enter leaves `activeElement` on `<body>` | `index.html:49` → `:87` | Probe: after Enter, `activeElement=body`, `scrollY=57`; Chrome moves the *sequential focus point*, so the next Tab correctly lands on `#open-pack`. Works in Chrome, browser-dependent in others | 2.4.1 |
| m3 | Sound toggle accessible name does not contain its visible text | `index.html:74-81`, `app.js:1336` | name "Ton"/"Sound" vs visible "Ton an"/"Ton aus" (state is correctly in `aria-pressed`) | 2.5.3 |
| m4 | Language buttons: name "Deutsch"/"English" vs visible "DE"/"EN" | `index.html:70-71` | Abbreviation case; speech input users say the full name, sighted users read the abbreviation | 2.5.3 |
| m5 | Progressbar name duplicates its own value | `index.html:101`, `app.js:1043-1051` | `aria-labelledby` → "0 von 10 gesehen" **and** `aria-valuenow=0`; announced twice. No `aria-valuetext`. The accessible name changes as progress changes | 4.1.2 |
| m6 | Full-card `aria-label` is a 300+ char run-on with doubled periods | `app.js:762-770` + strings ending in "." at `:47,48,52` | Observed: `"… Die Decke geeinigt.. Elsa schläft … grünen Decke.. Häufig. Fantasiewerte …"` — join with `". "` on strings that already end in `.` | 1.3.1 / 2.4.6 (quality) |
| m7 | Flipping drops the flip hint from the accessible name | `app.js:1017` | After `F`, label becomes `"Name. Rückseite der Karte."`; the committed row says "Flip hint persists in accessible name" (`:225`) | 2.4.3 |
| m8 | Control borders are 2.33:1 (`--line-strong` = 28 % ink over `--bg`) | `style.css:300` (outline button), `:183` (lang switch), `:209` (sound toggle) | Below the 3:1 non-text floor. Text inside passes, so the border is not the only identifier — but a boundary-less button on a dark field is hard to perceive | 1.4.11 |
| m9 | Card-dialog close border is 2.88:1 | `style.css:685` | 34 % ink over the dialog gradient; just under 3:1 | 1.4.11 |
| m10 | Progress track is 1.39:1 against the page | `style.css:307` | Informational only — the value is carried by the label text and `aria-valuenow`, and the *fill* is 8.6–9.8:1 against the track. Recorded so it is not mistaken for a pass by accident | 1.4.11 (N/A rationale) |
| m11 | Seen/unseen has **no visual indicator at all** | `app.js:56,141` (`seenTag` dead), no CSS, no `data-seen` | The colour-as-only audit's non-colour backup does not exist. No colour-only failure (there is no colour signal either) — the information is simply missing for sighted users | commitment `:123` |
| m12 | Empty state and no-JS notice sit at the end of the document | `index.html:219-223`, `app.js:1104-1132` | With JS off the pack button still looks active and does nothing; the explanation is below an empty binder. Commitment met in content, not in discoverability | 3.3.1 (weak) |
| m13 | Pack dialog has no backdrop-click dismissal while the card dialog does | `app.js:317-319` | Inconsistent dismissal model; UX spec requires backdrop close after reveal (`interaction-patterns.md:192`) | parity, not WCAG |
| m14 | Closing mid-reveal still announces a pack that is no longer visible | `app.js:938-951` | The `openPack` continuation is not cancelled on `close`, so `packAnnounce` fires into `#live` after the dialog is gone | 4.1.3 |
| m15 | `#live` has no `aria-atomic` | `index.html:217` | `announce()` clears then writes 30 ms later; works in Chrome, atomicity is not declared | 4.1.3 |
| m16 | 6 dead copy keys weaken the i18n/a11y contract | `app.js:54,56,86,87,139,141,170-172` | `photoAlt`, `seenTag`, `dialogProgress`, `dialogProgressAll`, `packProgressDefault`, `packCaption` are never rendered; `photoAlt` would have given a generic fallback | i18n hygiene |
| m17 | Flat Tab sequence through every binder tile | `app.js:1072-1093` | 10 tiles today, "200+ photos" per PRD OQ2 tomorrow; no roving tabindex, no per-set landmark. Friction, not a trap | 2.4.1 (quality) |
| m18 | Reduced-motion mode plays no per-card ticks/chime | `app.js:925-936` (tick only inside the timeout branch) | The requirement doc says sounds still play under reduced motion (`:111`); they do not, for the immediate-append path. Visual parity is unaffected | doc mismatch |

**Adjacent finding — content canon, not an accessibility defect (not counted in §1):** `assets/js/card-bank.js:19,37,51,69` still ships wet-dog/rain lines ("Nass bis auf die Haut…", "Nach dem Regen riecht sie nach nassem Hund…" and their English twins). `AGENTS.md` (canon ruling 2026-11-22) forbids all water content and retires exactly these legacy bank jokes in the build phase. They are reachable today only through demo cards (`app.js:656` uses the bank solely when `photo.demo` is true; real photos carry their own `description`), but they must be rewritten, not re-imported, in the refactor. Flagged here so the rewrite is not lost between the a11y and content workstreams.

---

## 6. Contrast measurements (full record)

Measured with a WCAG 2.x relative-luminance implementation; `--quiet` rows use **sampled rendered pixels** (see M1), all others use token pairs and explicit alpha compositing.

### 6.1 Page-level text

| Pair | Ratio | Required | Verdict |
|------|-------|----------|---------|
| `--ink` on `--bg` | 16.69:1 | 4.5 | PASS |
| `--ink` on `--surface` | 14.55:1 | 4.5 | PASS |
| `--ink` on `--surface-light` (pressed lang) | 12.78:1 | 4.5 | PASS |
| `--muted` on `--bg` | 7.74:1 | 4.5 | PASS |
| `--muted` on `--surface` | 6.74:1 | 4.5 | PASS |
| `--muted` on album `#15131b` | 7.53:1 | 4.5 | PASS |
| `--metal` on `--bg` (10 px eyebrow) | 10.88:1 | 4.5 | PASS |
| `--metal` on album (13 px count) | 10.59:1 | 4.5 | PASS |
| `--accent` on `--bg` (share status, 12 px) | 12.00:1 | 4.5 | PASS |
| `--quiet` — five strings | **3.48–4.13:1** | 4.5 | **FAIL** (M1) |

### 6.2 Controls, focus and boundaries

| Pair | Ratio | Required | Verdict |
|------|-------|----------|---------|
| Focus ring `--accent-bright` vs bg / surface / album / lightbox | 14.77 / 12.87 / 14.37 / 14.61 | 3 | PASS |
| Card focus ring `#fff0d9` vs bg | 16.86 | 3 | PASS |
| `.button--primary` label `#211d2a` on every foil stop (incl. holo stops) | 6.17 – 12.74 | 4.5 | PASS |
| Outline-button / lang / sound border (`--line-strong`) | **2.33** | 3 | FAIL (m8) |
| Card-dialog close border (34 % ink) | **2.88** | 3 | FAIL (m9) |
| Progress fill vs track | 8.63 – 9.82 | 3 | PASS |
| Progress track vs page | 1.39 | 3 | informational (m10) |
| Card frame border (42 % white) vs page | 4.08 | 3 | PASS |

### 6.3 Card micro-type (4.5:1 applied to every size — stricter than the large-text allowance)

| Element | Worst-case ratio | Required | Verdict |
|---------|------------------|----------|---------|
| `.card__number` 10 px | 7.44 | 4.5 | PASS |
| `.card__name` 15–19 px bold (tile/drop) | 13.48 | 4.5 | PASS |
| `.card__mood` 9–11 px | 7.68 | 4.5 | PASS |
| `.card__rarity` 8–10 px | 8.87 | 4.5 | PASS |
| `.card__kind` 9 px | 8.15 | 4.5 | PASS |
| `.card__copy` 10–11 px | 7.98 | 4.5 | PASS |
| `.card__keyword` 9–10 px | 8.80 | 4.5 | PASS |
| `.card__print` 9–10 px | 5.56 | 4.5 | PASS |
| `.card__stat-key` 7–9 px | 6.87 | 4.5 | PASS |
| `.card__stat-value` 11–14 px bold | 12.90 | 4.5 | PASS |
| `.card__stats-label` 6–8 px | 7.76 | 4.5 | PASS |
| `.card__serial` 9–13 px | 7.10 | 4.5 | PASS |
| `.card__credit` 8–10 px | **4.56** | 4.5 | PASS — no headroom; any lighter backdrop fails |
| `.card__back-series` 9 px | 7.20 | 4.5 | PASS |
| Rare/holo foil name gradient (darkest stop `#d4bdff`) | 8.71 | 4.5 | PASS |
| Holo rarity chip (dark text on foil, darkest stop) | 5.99 | 4.5 | PASS |

**Conclusion for card print**: the micro-type concern in the requirements doc (`:109`) is a **size/decision** question, not a contrast failure — every card token clears 4.5:1 at the darkest composited stop, with `card__credit` at 4.56:1 as the thin margin. `card__copy` at 11 px in the mobile full card is legible by ratio but below any comfortable reading size; the owner/ux-designer decision (OQ `:294`) still has to be made.

Not computable, therefore not claimed: `.pack__seal-word` (gradient text over `color-dodge` foil + photo + shadow, `style.css:898-906`), `.pack-dialog__seal-copy` 8 px over the foil sachet (`:481`), and any card text read through the pointer-driven foil highlight. See §10.

---

## 7. Touch-target measurements

See M9 for the table. Reproduce with: launch Chrome headless, set viewport 390×844 (`isMobile`), collect `getBoundingClientRect()` for every `a[href], button, [role=button], [tabindex="0"]` with `getClientRects().length`, repeat with the pack and card dialogs open, and repeat at 1280×900. Full pass/fail list is in §M9.

---

## 8. Keyboard, focus and motion — observed behaviour

### 8.1 Tab order at 1280×900 from the top (exact)

```
1  a.skip-link            "Direkt zum Pack"
2  a.wordmark             "Elsen, zurück zum Pack"
3  a.nav-link             "Sammelheft"
4  button                 "Deutsch"
5  button                 "English"
6  #sound-toggle          "Ton"
7  #open-pack             "Pack öffnen"
8  a.text-link            "Sammelheft ansehen"
9  #pack-seal             "Ein Pack Elsa-Karten öffnen"
10 #reset-lap             "Von vorn"
11 … tile 01              "Karte 01 öffnen: Abgemeldet auf Grün"
12 … tile 02              "Karte 02 öffnen: Blickkontakt-Expertin"
```

Logical: skip link first, header, stage, album. No `tabindex > 0` anywhere. No keyboard trap. Note that a destructive control (#10) precedes the collection it destroys — acceptable ordering, fatal only because of C1.

### 8.2 Verification results

| Behaviour | Result |
|-----------|--------|
| Skip link visible on focus | PASS — `:focus` reveals it (`style.css:137`); 157×46 |
| Skip link moves focus | Partial — focus point moves (next Tab = `#open-pack`), `activeElement` stays `body` (m2) |
| Visible focus ring | PASS — `#open-pack` 2 px `rgb(247,224,194)` offset 4; tile and full card 2 px `rgb(255,240,217)` offset 5; all `:focus-visible` confirmed by `matches(":focus-visible")` after keyboard focus |
| Dialog `aria-labelledby` resolves | PASS — pack: "Dein Pack"; card: `#card-full-name` exists while open |
| Dialog focus containment | PASS (native) — 10 Tabs cycled close → card → primary → save → share; one Tab lands on `body` between cycles (native `<dialog>` behaviour, documented, not a trap) |
| `←` / `→` in the card dialog | PASS — "Abgemeldet auf Grün" → "Blickkontakt-Expertin", announcement re-fired |
| `F` flip | PASS — `aria-pressed` true, faces' `aria-hidden` swapped, flip announced |
| Enter/Space on the card | PASS — `role="button"` + document handler (`app.js:1213`) |
| Escape closes both dialogs | PASS — native |
| Focus return, pack dialog | PASS when the trigger is enabled; **FAIL during the reveal** (body, M3) |
| Focus return, card dialog | **FAIL** — always `#open-pack` (M4) |
| `P` outside modals | PASS (opens, guards modifiers and text fields) |
| `P` inside the pack dialog | **FAIL** — re-opens a pack in the modal (M5) |
| Close button during reveal | **FAIL** — disabled (M2) |
| Reduced motion: content parity | PASS — five cards immediately, sachet hidden, no confetti |
| Reduced motion: actual motion | **FAIL** — motes repaint/pulse, pointer tilt still applies (M8) |
| Reduced motion: smooth scroll, transitions | PASS — `scroll-behavior: auto`, 0.01 ms durations |
| 320 / 390 / 414 / 768 / 1024 / 1280 / 1920 widths | PASS — `scrollWidth === innerWidth` at every width (landing state); dialogs were only measured at 390 and 1280 |

---

## 9. Standard-tier commitment mapping

Legend: **PASS** · **FAIL** · **PARTIAL** · **N/A** (tier says not applicable) · **N-A** = NOT ASSESSED (see §10).

### 9.1 Visual accessibility

| Commitment (`design/accessibility-requirements.md`) | Verdict | Evidence |
|---|---|---|
| Text contrast — `--ink` on `--bg`/`--surface` | **PASS** | 16.69 / 14.55:1 (§6.1) |
| Text contrast — `--muted` on `--bg`/`--surface` | **PASS** | 7.74 / 6.74 / 7.53:1 |
| Text contrast — `--quiet` hints, notes, footer | **FAIL** | 3.48–4.13:1 measured in situ (M1) |
| Text contrast — `--accent` on `--bg` | **PASS** | 12.00:1 |
| Minimum text size — UI | **FAIL** | Sizes 11–12 px are within the doc's allowance, but the rule is conditional on 4.5:1, which these strings fail (M1) |
| Minimum text size — card replica text | **N-A** | Decision still open (OQ `:294`); measured sizes 6–10 px exist; ratios pass (§6.3) |
| Text resizing — 200 % | **N-A** | No horizontal overflow at 320–1920; 200 % zoom itself was not exercised; dialogs untested at 320/1920 (§10) |
| Reduced motion | **FAIL** | Motes + pointer tilt still animate (M8), measured |
| Colorblind mode (adapted: safety by design) | **N-A** (simulation) / **PASS** (DOM) | Coblis not run (§10). Non-colour backups exist for rarity (text chip + stars, `app.js:802-803,733-744`) and share state (text). **Seen/unseen has no visible backup** (m11) |
| High contrast mode | **N/A** (out of tier) | Forced-colors spot-check not run |
| Screen flash / strobe | **PASS** | One-shot `pack-flash` 900 ms, one-shot confetti, holo glint is a 5.2 s shimmer (not a flash); all killed under reduce |
| Subtitles / captions | **N/A** | No spoken content |

### 9.2 Colour-as-only-indicator audit

| Location | Verdict | Evidence |
|---|---|---|
| Card rarity | **PASS** | Always-visible text chip (`card__rarity`) + 3/4/5 stars (`card__stars`, `aria-hidden` because the label carries it) |
| Foil glint / shimmer | **PARTIAL** | The label+stars backup exists; the *motion* component is not fully reducible (M8) |
| Seen / unseen in binder | **FAIL** | No visual tag exists (m11); accessible name + progress line only |
| Completed set | **PASS** | Text in the progress line + `lastOneAnnounce` |
| Share success / failure | **PASS** | `role="status"`, text is the carrier, failure string is as visible as success (`style.css:562`) |
| Primary vs outline buttons | **PARTIAL** | Fill vs outline + distinct labels; the outline boundary is 2.33:1 (m8) |
| Language toggle active state | **PASS** | `aria-pressed` + fill/shape; pressed text 12.78:1 |

### 9.3 Motor accessibility

| Commitment | Verdict | Evidence |
|---|---|---|
| Full input remapping | **N/A**, but **FAIL** for 2.1.4 | Six bindings, no remap needed; `P` has no turn-off and is modal-unsafe (M5) |
| Input method switching | **PASS** | One control set for mouse/touch/keyboard |
| One-hand mode | **PASS** | Single discrete activations only |
| Hold-to-press alternatives | **N/A** | No hold inputs |
| Rapid input alternatives | **N/A** | No mashing |
| Input timing adjustments | **PASS** | No timers; reveal is non-blocking |
| Aim assist | **N/A** | No targeting |
| Touch target size — 44 px | **FAIL** | 11 distinct controls below 44, reproduced in 4 viewport/dialog states (M9) |
| Keyboard completeness | **FAIL** | M2, M3, M4, M5; everything else reachable with a logical order (§8.1) |
| Visible focus | **PASS** | Measured rings, ≥14.8:1 |
| HUD repositioning | **N/A** | No HUD |

### 9.4 Cognitive accessibility

| Commitment | Verdict | Evidence |
|---|---|---|
| Difficulty options | **N/A** | No fail state, no score, no timer |
| Pause anywhere | **PASS** | Both dialogs dismiss/reopen without loss |
| Destructive action clarity — reset | **FAIL (Critical)** | C1 |
| Objective / progress clarity | **PARTIAL** | Stage progress line + labelled progressbar pass; the claimed repetition in the pack dialog does not exist (m5, §1) |
| Tutorial / hints | **PARTIAL** | Hints persist but two fail contrast (M1); `.stage__hint` is `display:none` ≤760 px (`style.css:587`), `.print__hint` hidden ≤380 px and at short heights (`:825,833`) — on a phone the keyboard instructions disappear rather than staying re-readable |
| No auto-dismissing actionable content | **PASS** | `share-status` clears after 3.4 s but is confirmation only (`app.js:1302-1308`) |
| Reading time — pack reveal | **PASS** | Nothing expires; reduced motion shows all at once |
| Language of the interface | **PASS** | Verified DE→EN: `<html lang>`, `<title>`, nav label, sound label, skip text, hint, `aria-pressed` pair, and `#live` "Switched to English." |
| Consistent navigation patterns | **PARTIAL** | Dialog dismissal differs (backdrop closes card dialog only, m13); focus return differs between dialogs (M4) |

### 9.5 Auditory accessibility

| Commitment | Verdict | Evidence |
|---|---|---|
| Subtitles for spoken dialogue | **N/A** | No speech |
| Independent volume controls | **N/A** | Binary toggle, no channels |
| Mono audio option | **N/A** | Mono WebAudio |
| Visual equivalents for all sounds | **PASS** | Pack dialog + sachet + "opening" announcement; cards appear + rarity label/stars; muting loses nothing. (Tick/chime are skipped in reduce mode — m18, parity unaffected) |
| Sudden-loud-sound control | **PASS** (control) / **N-A** (loudness) | Toggle present, persists, `aria-pressed`; output not audible in this environment |

### 9.6 Platform / browser

| Commitment | Verdict | Evidence |
|---|---|---|
| Xbox / PS / Steam / native APIs | **N/A** | N/A rows stand |
| Desktop screen readers (names, roles, live, native dialog) | **PARTIAL** (code + AX tree) | Accessible names present on every control; roles/landmarks correct; dialog label resolves; focus containment works. Actual VoiceOver/NVDA behaviour **N-A** (§10) |
| OS preference media queries | **FAIL** (reduced motion) / **N-A** (forced colors) / **PASS** (dark scheme) | M8; `color-scheme: dark` + meta declared (`index.html:9`, `style.css:10`) |
| Zoom & responsive | **PARTIAL** | No horizontal overflow 320–1920 (landing); 200 % zoom and dialog reflow untested |
| iOS/Android native APIs | **N/A** | Web only |

### 9.7 Features explicitly in scope (above baseline)

| Commitment (`:63-66`) | Verdict | Evidence |
|---|---|---|
| Bilingual accessibility surface — every `aria-label`, announcement and rarity label switches | **PASS** | Probe DE→EN switched nav label, sound name, skip text, hint, `<title>`, and announced in EN; rarity labels come from `card-bank.js` per language |
| No-JS graceful state | **PARTIAL** | Notice exists and is German by default (correct when JS is off); it sits at the end of the document under an empty binder, and the pack button still looks active (m12) |
| `aria-live` wired for the full pack flow | **PARTIAL** | Opening, pack list, card open, flip, restart, language switch: yes. Per-card reveal: no (one consolidated announcement). Errors/empty state: no (M10) |

### 9.8 Per-feature matrix rows that carry a finding

| Row (`:220-229`) | Verdict |
|---|---|
| Pack Generation | PARTIAL — label swap + announcement work; the `P` guard is not sufficient (M5) |
| Reveal Theatre | PASS visually; pointer skip disabled (M2) |
| Collection & Sets | **FAIL** — reset without confirmation (C1); no visible seen tag (m11); tiles 172×292 pass |
| Milestones & Unlocks | PASS — text completion + announcement |
| Chase Card | PASS — label + stars; foil not computable over the photo (N-A) |
| Binder tile → Card flip | PARTIAL — works; hint not persistent after flip (m7) |
| Card Detail & Share | **FAIL** — close 36 px (M9), focus return wrong (M4), micro-copy decision open |
| Photos Pipeline | **FAIL** — no failure fallback, no announcement (M7); empty state not announced (M10) |
| Persistence | PARTIAL — storage failure falls back correctly (code); reset destructive (C1) |
| i18n | PASS — 0 untranslated strings observed in the switched UI |

---

## 10. NOT ASSESSED register

| Item | Reason it cannot be answered from this environment | What would settle it |
|---|---|---|
| Screen-reader pass (VoiceOver/Safari, NVDA/Chrome, TalkBack) | No AT available in the headless environment; only the AX tree and accessible-name computation were inspected | Manual session per the test plan (`:240`); record the spoken order of the pack flow |
| Colorblind safety (Coblis Protan/Deutan/Tritan) | Needs screenshots + an external simulator; not run | Simulate 4 screens (stage, pack dialog, full card, binder) and confirm rarity/seen/share state stay identifiable |
| 200 % browser zoom and text-only zoom | Browser zoom emulation is not equivalent; only width-based overflow was measured | Real 200 % zoom at 1280 px, plus dialog reflow at 320 px |
| Forced-colors / `prefers-contrast` | Not emulated in this run; the doc already lists forced-colors as unassessed (`:207`) | Windows High Contrast spot-check; verify gradient-clipped names (`cards.css:126-135,380-383`) stay visible |
| Contrast over blend-mode and photo surfaces (`.pack__seal-word`, `.pack-dialog__seal-copy`, card foil over the photo) | Backdrop is a stack of `color-dodge`/`hard-light` layers over an arbitrary photograph — not derivable from tokens; would need per-photo screenshot sampling and a worst-case rule | Sample rendered pixels behind each glyph over a representative card set; if any stop fails, add a scrim or a text-shadow floor |
| HEIC conversion end-to-end | No HEIC file in the manifest and the vendor decoder is local; only the failure branch could be exercised | Add one HEIC fixture to the dev manifest and run the conversion path |
| Audio loudness / sudden-sound character | Headless, no audio device | Listen on the reference device at default volume |
| Card micro-type legibility decision | Owner/design decision open (OQ `:294`), not an audit fact | Decide: raise the `card__copy` floor in the full dialog, or declare the print layer decorative in the doc |
| Reduced-motion "no motion beyond opacity-only fades" for `backdrop-filter`/`filter` transitions | No filter animations exist at rest, but blur re-composition on dialog open is not measurable as "motion" here | Manual visual check on a low-end device |

---

## 11. Prioritised fix list for the refactor

Ordered so that each item is independently shippable and testable. Every P0 is a tier commitment currently failed; P1 closes committed "verify" rows; P2 is quality and hygiene.

### P0 — must land before the refactor is called Standard-compliant

1. **Reset confirmation** (C1). Native `<dialog>`, Cancel focused by default, Escape cancels, confirm announces what was cleared and how many cards return. Add the Playwright case: one activation must not change the seen-set.
2. **Kill `--quiet` as a text colour** (M1). Promote the five strings to `--muted`, or introduce `--quiet-text` that measures ≥4.5:1 over the **composed** backdrop (page + radial glow + noise overlay). Encode in `tokens.ts`; make the Vitest contrast gate read the composed backdrop and fail the build below 4.5:1.
3. **Text alternatives for photos at browse level** (M6). Use the manifest `alt` (already bilingual) as `aria-describedby`/`alt` on tiles and drop cards; keep the fictional card name as the name. Do not duplicate the description in both places.
4. **Image failure fallback + announcement** (M7). One shared failure state: visible bilingual label inside the photo window, card text still readable, one deduplicated `aria-live` message. A single global `error` handler for all card images, not only HEIC.
5. **Reduced motion, actually** (M8). One static mote frame + cancelled rAF; no spring integrator in reduce mode; hover lifts become opacity steps. Assert with Playwright: canvas pixels stable, card transform unchanged across pointer positions.
6. **Modal keyboard model** (M2, M3, M5, m14). ✕ and Escape live for the whole reveal; `P` inert while any modal is open plus one 2.1.4 remedy; never disable the element that owns focus — move focus first; cancel the reveal continuation on close so no stale announcement fires.
7. **Focus return** (M4). Restore to the originating tile (`data-photo-id` captured at open), then the pack close button, then the stage trigger.
8. **44 px targets** (M9). A `--target` token applied to the dialog close, action row, language pair, sound toggle and every standalone link hit area; drop the 32/34/38 px short-viewport overrides.

### P1 — closes committed rows that are currently partial

9. **Visible seen/unseen tag** (m11) — text + shape, plus a `data-seen` attribute so the state is not colour-only by accident later. Update `:123` or implement it, but the doc and the code must agree.
10. **Live-region coverage** (M10): empty state, image failures, reset confirmation, `aria-atomic="true"`; review the pack list announcement as the intentional design and correct `:66`.
11. **Progress semantics** (m5): static accessible name ("Sammelkarten-Fortschritt"), `aria-valuetext` ("3 von 24 gesehen"), and either add the pack-dialog progress line or delete the claim at `:160`.
12. **Label-in-name alignment** (m3, m4): sound toggle name should contain "Ton an/Ton aus" (or keep "Ton" and drop the visible state text in favour of `aria-pressed`); language buttons either expose "DE"/"EN" as the name or mark the visible text `aria-hidden`.
13. **Boundary contrast** (m8, m9): raise `--line-strong` (and the close-button border) to ≥3:1, or add a second visual boundary (fill) for outline controls.
14. **Accessible-name quality** (m6, m7): join sentences without doubling periods, cap the full-card label length, keep the flip hint after flipping.
15. **Decide card micro-type** (OQ `:294`): raise `card__copy` in the full dialog to ≥12 px on mobile or formally declare the print layer decorative. `card__credit` has only 4.56:1 headroom — lock it to a token, not a literal (`cards.css:248`).

### P2 — quality, hygiene, and the 200-photo future

16. `tabindex="-1"` on `#stage` (m2); `<header>`→`div` (or `role="presentation"`) inside the pack dialog (m1); skip-link test in CI (Enter → next Tab lands in the stage).
17. No-JS notice next to the trigger, and disable/style the pack button when JS is absent (m12).
18. Remove the 6 dead copy keys or wire them (m16); add the i18n check to CI so a new `aria-label` cannot ship untranslated.
19. Binder paging or roving tabindex for 200+ tiles (m17); a per-set `<section>` with a heading keeps the landmark structure honest as the collection grows.
20. Backdrop-dismiss parity between dialogs (m13); keep the "re-open pack from the card dialog" focus chain specified at `interaction-patterns.md:192` (the 160 ms hand-off is currently a `setTimeout`, `app.js:300-303` — verify focus lands on the new dialog).
21. CI gates for the new stack: Playwright + axe-core as a CI job (a real dependency addition — decide it in an ADR with the fallback ladder), the Vitest contrast gate over `tokens.ts`, a keyboard walkthrough spec (Tab order, Escape returns, P inert in modals), and a reduced-motion pixel-stability spec. The current project has no automated a11y test at all (`scripts/qa.mjs` is a screenshot pass only).

---

## 12. Audit artifacts and reproduction

- Contrast: ratios in §6 were produced by a self-contained relative-luminance script (sRGB linearisation, alpha compositing, WCAG thresholds); `--quiet` rows sample the rendered pixels immediately beside each string in a 1× DPR screenshot, with the capture offset verified against the opaque colophon control (`#100f15` round-trip). Re-running the same pairs is deterministic.
- Runtime: Chrome headless via the project's `puppeteer-core`; viewports 320–1920; `emulateMediaFeatures` for reduced motion; `page.accessibility.snapshot()` for the AX tree. Temporary probe scripts were deleted after the run; this audit created only this report and modified no code or design file.
- Line numbers refer to the working tree at the audit date. `assets/css/style.css` contains the duplicate `.lightbox` blocks noted in `AGENTS.md`; **the later "Open-card fit and pack theatre" block is the active layout** and the line references above use it (`:652+`).
- Next audit: re-run after P0 and P1, with a real screen-reader pass and a Coblis pass, and record the results in the doc's Audit History table.
