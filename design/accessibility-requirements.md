# Accessibility Requirements — Elsa the Explorer

> **Status**: Committed (project commitment, authored with the owner's approval on 2026-11-22)
> **Author**: owner + accessibility-specialist
> **Last Updated**: 2026-11-22
> **Accessibility Tier Target**: Standard
> **Platform(s)**: Web only — desktop and mobile browsers (current Safari, Chrome, Firefox, Edge; iOS Safari; Android Chrome). No native app, no console, no gamepad.
> **External Standards Targeted**:
> - WCAG 2.2 Level AA — per PRD §5. *Conflict note:* the studio framework's default target is WCAG 2.1 AA; this project's own PRD commits to 2.2 AA, which is a superset. 2.2 AA governs here; the deviation is flagged in Open Questions.
> - AbleGamers CVAA Guidelines — N/A (no communication features: no voice chat, no messaging, no accounts)
> - Xbox Accessibility Guidelines (XAG) — N/A (no console release)
> - PlayStation Accessibility — N/A (no console release)
> - Apple / Google Accessibility Guidelines — N/A as platform requirements (web only); OS screen readers are supported through the browser and are in scope via the screen-reader rows below.
> **Accessibility Consultant**: None engaged
> **Linked Documents**: `PRD.md` (§4.1 F17–F22, §5 Accessibility, §9 Open Questions), `index.html`, `assets/js/app.js`, `assets/css/style.css`, `assets/css/cards.css`
> **Template**: Accessibility Requirements

> **Why this document exists**: Per-screen annotations live in the code and the PRD; this
> document records the project-wide accessibility commitments, the feature matrix, the
> test plan and the audit history. It is the standard the site is audited against. If a
> feature conflicts with a commitment made here, this document wins — change the
> feature, not the commitment, unless the owner approves a formal revision.
>
> **When to update**: after each accessibility audit, whenever a feature is added or
> changed (e.g. the planned visitor-upload moderation page, PRD §10.4), and whenever an
> Open Question is resolved.

---

## Accessibility Tier Definition

The studio tier ladder, adapted honestly to a static web app. Several native-game
features (input remapping, subtitles, gamepad) have no meaning here; where a tier
feature does not map to the web, the web equivalent is stated.

### Tier Definitions

| Tier | Core Commitment | Typical Effort |
|------|----------------|----------------|
| **Basic** | Critical text readable at standard resolution; no feature requires color discrimination alone; completable without photosensitivity risk. Web equivalent: semantic HTML, contrast on main copy, no-JS notice. | Low |
| **Standard** | All of Basic, plus: full input coverage for mouse, touch and keyboard; screen-reader support (roles, accessible names, `aria-live` announcements, focus management); colorblind-safe by design (no color-only information, verified by simulation); visible focus; contrast 4.5:1 for text; `prefers-reduced-motion` honoured everywhere. | Medium |
| **Comprehensive** | All of Standard, plus: in-app text-scaling and style controls, dedicated high-contrast mode, per-channel audio controls, cognitive-load assist tools — on the web this means replicating in settings what the platform already does partially for free. | High |
| **Exemplary** | All of Comprehensive, plus: full visual customization, cognitive simplification modes, and an external third-party accessibility audit. | Very High |

### This Project's Commitment

**Target Tier**: Standard

**Rationale**: Elsa the Explorer is a card library — a growing archive of Elsa's photos
that the owner keeps adding to over time, and that family and friends of all ages
visit. The audience explicitly includes older, non-technical relatives (the "Die Oma"
persona) who may use larger text, a screen reader or only a phone with one hand. It runs on the open web, so the platform
already contributes real accessibility machinery — browser zoom, OS reduced-motion and
forced-colors preferences, VoiceOver/TalkBack/NVDA through the browser — which a
Standard-tier effort can lean on instead of rebuilding. The product is a single page
with two dialogs, no accounts and no data entry, so a Comprehensive tier (in-app text
scaling, custom themes, per-channel audio) would buy little that the platform does not
already provide. The owner is a solo maintainer whose time is the scarcest resource
(PRD §7); a heavier tier would guarantee drift between commitment and reality. Standard
is therefore the honest ceiling: everything a visitor on a browser can meaningfully be
promised, without pretending to native platform APIs the project does not have.

**Features explicitly in scope (beyond tier baseline)**:
- Bilingual accessibility surface: every `aria-label`, announcement and rarity label switches with the DE/EN toggle (PRD F8) — above baseline because announcements in the wrong language are useless.
- No-JS graceful state: the `<noscript>` notice explains in the visitor's language why the pack cannot open (PRD edge case).
- `aria-live` announcements are wired for the full pack flow (opening, per-card reveal, restart, language switch, card flip) — this is the core of the screen-reader promise.

**Features explicitly out of scope**:
- Gamepad, console and adaptive-controller support — web page, no Gamepad API usage planned (see Known Intentional Limitations).
- In-app text scaling beyond browser zoom, high-contrast mode, per-channel audio (see Known Intentional Limitations).
- Full WCAG AAA contrast on decorative card-print micro-text (see Known Intentional Limitations).

---

## Visual Accessibility

The palette is a dark velvet gallery (`style.css` :root):

| Token | Hex | Used for |
|-------|-----|----------|
| `--bg` | `#111017` | page background |
| `--bg-raised` / `--surface` / `--surface-light` | `#1b1823` / `#211d2a` / `#2c2736` | raised panels, cards, active controls |
| `--ink` | `#f5f0ea` | primary text |
| `--muted` | `#aaa3b2` | secondary text (lede, nav, labels) |
| `--quiet` | `#756e7d` | tertiary text (hints, notes, footer) |
| `--accent` / `--accent-bright` | `#e8c9a5` / `#f7e0c2` | focus ring, status text, primary button, pearl metal |
| `--metal` / `--metal-dark` | `#d4c2a8` / `#8e7c67` | card frame, decorative |

Contrast requirements: **4.5:1 for body-size text, 3:1 for large text and for
meaningful non-text UI elements (borders, focus ring, progress bar)** against the
surface actually behind them (WCAG 2.2 SC 1.4.3, SC 1.4.11). Hand-computed values
below are approximations for planning — **every pair must be confirmed with a contrast
checker tool before sign-off**; the tool result, not this table, is the record.

**Standing commitment (materials, per the art bible):** rarity/foil treatment and
completion states must **never be color-only**. Every state that foil, tint or color
signals carries a texture, motion or label backup — this is the visual-expression of
the art bible's material rules, and it is enforced row-by-row in the
Color-as-Only-Indicator Audit below. Any future foil, tint or completion treatment
that cannot name its non-color backup does not ship.

| Feature | Target Tier | Scope | Status | Implementation Notes |
|---------|-------------|-------|--------|---------------------|
| Text contrast — `--ink` on `--bg` | Standard | Headings, primary buttons, card names | Built — verify | Hand-computed ≈ 16.7:1. Passes AA comfortably. Verify on `--surface` and `--surface-light` cards too. |
| Text contrast — `--muted` on `--bg` / `--surface` | Standard | Lede, collection lede, masthead count, labels | Built — verify | Hand-computed ≈ 7.7:1 on `--bg`, ≈ 6.7:1 on `--surface`. Passes 4.5:1. |
| Text contrast — `--quiet` on `--bg` / `--surface` | Standard | `.stage__hint`, `.progress__note`, `.pack-dialog__hint`, `.print__hint`, footer line, `kbd` — all 11–12px | **Likely failing — fix or restrict** | Hand-computed ≈ 3.9:1 on `--bg`, ≈ 3.4:1 on `--surface`, and these are small hint texts. Options: darken `--quiet` (e.g. toward `#8d8696` territory, re-measure) or upgrade these strings to `--muted`. Measure first, then decide; do not ship hints below 4.5:1. |
| Text contrast — `--accent` on `--bg` | Standard | Focus outline, share status, pearl accents | Built — verify | Hand-computed ≈ 12:1 on `--bg`. Focus ring only needs 3:1; fine. |
| Minimum text size — UI | Standard | All interface copy | Built — verify | Base is 16px; hints 11–12px are persistent-readable (not transient), acceptable at Standard only if they pass contrast and never carry essential instructions alone — currently the `dialogHint` and `packHint` do carry keyboard instructions, so they must stay legible (see Open Questions). |
| Minimum text size — card replica text | Standard | `.card__print`, `.card__copy`, stat values on small tiles | Needs review | Tiles and even the full-card dialog scale printed card text down to 9–11px (`style.css` media queries). This is a faithful trading-card replica; the same text is in the accessible name/aria-label for screen readers. Decision needed: raise the full-dialog caption (`card__copy`) floor, or formally declare card-print text decorative. Flagged in Open Questions. |
| Text resizing — 200% | Standard | Whole page | Built via browser zoom | No in-app scaling (Standard, not Comprehensive). Mitigation: layout is fluid (`clamp()`, `svh` units) and must survive 200% browser zoom without horizontal overflow — this joins the F17 overflow test matrix. |
| Reduced motion | Standard | Sachet tear, card ascend (`pack__slot--reveal`), foil/glitter motion, confetti, ambient motes, card tilt spring, smooth scrolling | Built — verify | Two layers: a CSS kill-switch (`prefers-reduced-motion: reduce` → 0.01ms durations, animations off) and JS gating (`state.reduceMotion`: sachet hidden, cards appear at once, `celebrate()` returns early, ambient/idle animation and tilt spring disabled, `scroll-behavior: auto`). `playTick`/`playWin` still play in reduced-motion mode — acceptable, motion ≠ sound. Verify every animation is actually covered, including the pointer-driven foil layers. |
| Colorblind mode — Protanopia / Deuteranopia / Tritanopia filters | Standard (adapted) | Whole page | Covered by design, not by filters | No filter modes are built; the Standard commitment here is **colorblind-safety by design**: nothing may require color discrimination alone (see audit below). The tier's "at least one colorblind mode" is satisfied this way because the page ships no gameplay that color encodes exclusively. Verified via Coblis simulation in the test plan. |
| High contrast mode | Comprehensive | — | Out of scope | See Known Intentional Limitations; forced-colors behavior to be spot-checked. |
| Screen flash / strobe warning | Basic (adapted) | Confetti, pack flash, foil glare | Built — verify | No strobe sources exist; the `.pack-dialog__flash` and confetti are single-shot bursts, not loops. Harding-style audit unnecessary; confirm no looping flash survives reduced-motion. |
| Subtitles / captions | Basic | — | N/A | No spoken content exists (see Auditory Accessibility). |

### Color-as-Only-Indicator Audit

| Location | Color Signal | What It Communicates | Non-Color Backup | Status |
|----------|-------------|---------------------|-----------------|--------|
| Card rarity (common/rare/holo) | Foil strength, chip tint (`data-rarity`) | How shiny/collectible the card is | Text chip in the language of the page ("Häufig/Selten/Holo" — always visible on the plate) **and** star count (3/4/5, `card__stars`) | Built — verify in Coblis that chip tint + stars stay distinguishable |
| Foil glint / holographic shimmer | Iridescent gradient, glitter, tilt | "This one is special" | Rarity label + stars (above). The glint is atmosphere, never the sole carrier — but it must also not be the only *motion* cue; motion-sensitive players get the label. | Built — verify |
| Collected / not-yet-collected card in the collection | Tile treatment | Which cards the visitor has already collected | "gesammelt / collected" and "noch nicht gesammelt / not yet collected" text markers on the tile (`tile.state.collected` / `tile.state.unseen`); accessible names differ (`tile.aria.open` / `tile.aria.open.unseen`); progress line counts | Built — verify markers render on tiles, not color/dimming only |
| Completed set (all cards collected) | — | The pack starts over | Progress line reaches the total (`progress.overall`); `live.lap.restart` announces the restart ("Das waren alle Karten. Jetzt beginnt das Pack von vorn.") and `set.complete.announce` names the finished room ("{set} ist komplett. Alle da."). There is currently **no** gold tick; if one is added it must pair a shape/label with the color. | Built (text path) — verify |
| Share/copy success & failure | Accent-colored status line | Whether the link was copied | Message text itself ("Link kopiert" / failure string), announced through the **shared polite region** (`#live-status`, ADR-0010 §2) while this line carries the same text visually and holds no live semantics of its own — text is the carrier, color is styling only, and one event speaks once. No icon needed; never introduce color-only success/failure. | Built — verify failure string is as visible as success |
| Primary vs outline buttons | Fill color | Which action is primary | Filled vs outlined shape + distinct labels | Built |
| Language toggle active state | Background fill | Which language is active | `aria-pressed="true/false"` on both buttons (announced by screen readers); visible pressed style is shape+fill | Built — verify |

---

## Motor Accessibility

Single-page web app; inputs are taps, clicks, `Enter`/`Space`, one toggle key (`P`),
arrow keys and `Escape`. There are no holds, no mashing, no timed inputs, and nothing
is rebindable — because there is essentially nothing to bind.

| Feature | Target Tier | Scope | Status | Implementation Notes |
|---------|-------------|-------|--------|---------------------|
| Full input remapping | Standard | — | N/A | The entire input set is 6 bindings (`P`, `←`, `→`, `F`, `Escape`, plus standard `Tab`/`Enter`/`Space`). No conflicts are possible and none of them conflict with browser/AT defaults except `P`, which is guarded against modifier keys and text fields (`onKeydown`). Remapping machinery would outsize the game. Revisit if inputs are ever added. |
| Input method switching | Standard | Whole page | Built — verify | Mouse, touch and keyboard all drive the same buttons and `<dialog>`s simultaneously; no mode exists to switch. Prompts are plain text (`kbd` hints), not device-specific glyphs. |
| One-hand mode | Standard | Whole page | Built by design | Every action is a single discrete activation: open pack, tap a card, tap share/save. No two-handed or chorded interaction exists; mobile one-handed use is the primary case (PRD personas). |
| Hold-to-press alternatives | Standard | — | N/A | No hold inputs exist anywhere. |
| Rapid input alternatives | Standard | — | N/A | No mashing or repeated-input requirements exist. |
| Input timing adjustments | Standard | — | N/A | No timed inputs, no QTEs. The pack reveal delays are presentation only; the dialog is fully interactive while cards animate in, and reduced-motion removes the waits entirely. |
| Aim assist | Standard | — | N/A | No targeting of any kind. |
| Touch target size — 44px minimum | Standard | All buttons, tiles, dialog controls | Needs audit | `lightbox__close` measures 42px — just under. Audit every control at mobile widths (lang-switch buttons, tiles in the 2-col grid, pack seal). Fix sub-44px cases; spacing between targets counts toward effective size on touch. |
| Keyboard completeness | Standard | Whole page | Built — verify | `P` opens a pack; native `<dialog>` gives `Escape` and focus containment for free; `←`/`→` navigate cards inside the card dialog; `F` or `Enter`/`Space` on the card flips it; `Tab` order must be logical; focus returns to the pack button when the pack dialog closes (PRD F20). The skip link targets `#open-pack` — label and destination agree, per `design/copy/copy-deck.md` §11 D17 (ADR-0010 §5); `#stage` is the *focus fallback* target when the trigger is disabled in the empty state, not the skip link's destination. Verify nothing is keyboard-unreachable and no keyboard trap exists. |
| Visible focus | Standard | All interactive elements | Built — verify | `:focus-visible` outline: 2px `--accent-bright` + 4px offset. Verify it survives on dark surfaces, over photos, and inside dialogs; the ring must keep ≥3:1 against adjacent colors (SC 2.4.13 in WCAG 2.2). |
| HUD repositioning | Comprehensive | — | N/A | No HUD; the layout is a single scrolling page. |

---

## Cognitive Accessibility

| Feature | Target Tier | Scope | Status | Implementation Notes |
|---------|-------------|-------|--------|---------------------|
| Difficulty options | Standard | — | N/A | No fail states, no scores, no timers. The only "loss" is a card you have not collected yet — and the not-yet-collected-first draw guarantees progress (PRD F6). |
| Pause anywhere | Basic (adapted) | Dialogs | Built | A web page is inherently pausable (close the tab, look away). Both dialogs hold state and can be dismissed and reopened without loss; the pack re-renders via `renderPack()`. |
| Destructive action clarity — reset | Standard | "Von vorn / Start over" button | **Not met — add confirmation** | `resetLap()` clears the entire collected set immediately on one tap, with no confirmation and no undo; the button sits next to the album count where a mis-tap destroys progress. Requirement: two-step confirm (a confirm dialog, or press-again-to-confirm) plus an `aria-live` announcement of what was cleared. This is the one BLOCKING cognitive finding. |
| Objective / progress clarity | Standard | Progress line + bar | Built — verify | "Du hast {n} von {total} gesammelt." (`progress.overall`; e.g. "Du hast 3 von 24 gesammelt.") with a labelled `role="progressbar"` (`aria-valuemin/max/now`) and an explanatory note. Always visible in the stage; repeated in the pack dialog. |
| Tutorial / hints | Standard | `packHint`, `packDialogHint`, `dialogHint` | Built — verify | Hints are persistent text, not dismissible tooltips — they can always be re-read. Keyboard hints repeat in context (`P` on the stage; `←`/`→` in the card dialog). |
| No auto-dismissing actionable content | Standard | Share status line | Built — acceptable | `setShareStatus` clears after ~3.4s, but it is transient confirmation of an already-completed action; the shared link exists in the clipboard/sharesheet regardless. Nothing actionable ever auto-dismisses. Document: if a future status ever *asks* the visitor to act, it must persist. |
| Reading time — pack reveal | Standard | Card reveal sequence | Built — verify | One card at a time comes into the focus frame (300 ms, `--elsa-dur-cardin`), then a 260 ms hold and a 380 ms camera move to the next; card 4's 760 ms pull-back settles the 2 × 2 / 1 × 4 grid, first card to fully live in 3.15 s. Nothing is taken away and no choice expires; the dialog is interactive throughout. Reduced motion renders all four cards in their cells at first paint. Clock: `design/ux/pack-opening.md` §10.1; tokens: `design/art/motion-sheet.md` §3. |
| Language of the interface | Standard | Whole page | Built | German default, one-tap switch, announced via live region; `lang` attributes on the html element and per-button (`lang="de"/"en"`), so screen readers switch pronunciation. |
| Consistent navigation patterns | Standard | Whole page | Built — verify | Header nav is constant; dialogs behave identically (Escape, close button, focus return). Verify focus return target after the *card* dialog closes too (currently specified for the pack dialog). |
| Punctuation and announcements | Standard | All visible copy and live-region strings | Required | At most one exclamation mark per visible surface; never in an error, a destructive confirmation or an accessibility string. The terminal `!` is removed before text enters a live region. Sanctioned visible surfaces: the arrival line (`zuwachs.line`) and the set-complete note; announced strings carry none. |

---

## Auditory Accessibility

All audio is synthesized WebAudio feedback (`playRip`, `playTick`, `playWin`) behind a
single toggle that persists. Sound is never required: nothing in the game is only
communicated by sound, and the toggle state is announced with `aria-pressed` + label text.

| Feature | Target Tier | Scope | Status | Implementation Notes |
|---------|-------------|-------|--------|---------------------|
| Subtitles for spoken dialogue | Basic | — | N/A | There is no spoken or voiced content of any kind. |
| Independent volume controls | Basic | — | N/A (with reason) | Only a binary toggle exists; there are no music/SFX/voice channels to balance. Sound is optional decorative feedback that never carries required information, so an off state is equivalent to every other state. If channelized audio is ever added, this row becomes a requirement. |
| Mono audio option | Comprehensive | — | N/A (with reason) | All output is mono synthesized WebAudio; there is no stereo field, no spatialization, nothing to fold. |
| Visual equivalents for all sounds | Standard | Pack rip, per-card tick, rare/holo chime | Built — verify | Rip → pack dialog opens with the sachet visible + "opening" announcement; tick → each card visibly appears in sequence; chime → rarity is simultaneously shown by label + stars. Muting loses nothing. |
| Sudden-loud-sound control | Basic | WebAudio output | Built | The toggle is one tap from the masthead and defaults per stored choice; sounds are short, soft, synthesized. No jump-scare audio design. |

### Gameplay-Critical SFX Audit

No sound in Elsa the Explorer carries information the visitor needs to act on; each entry lists its
required visual/announcement equivalent, which must exist before the sound ships.

| Sound Effect | What It Communicates | Visual Backup | Caption Required | Status |
|--------------|---------------------|--------------|-----------------|--------|
| Pack rip (`playRip`) | A pack is opening | Pack dialog opens; sachet element; `openingAnnounce` live-region message | No — no spoken content | Built — verify |
| Card tick (`playTick`) | A card has been dealt | Card appears in the drop row; per-card announcement (`cardNumber. name. rarity.`) | No | Built — verify |
| Rare/holo chime (`playWin`) | A rare or holographic card appeared | Rarity text chip + star count on that card; "big" confetti | No | Built — verify |

---

## Platform Accessibility API Integration

Elsa the Explorer has no native platform APIs. The "platforms" are the browser and the OS features
the browser inherits; support is delivered through semantic HTML + ARIA.

| Platform | API / Standard | Features Planned | Status | Notes |
|----------|---------------|-----------------|--------|-------|
| Xbox (GDK) | XAG | — | N/A | No console release; web page only. |
| PlayStation 5 | Sony Accessibility Guidelines | — | N/A | No console release. |
| Steam (PC) | Steam Input | — | N/A | Not a distributable native build; no controller input exists. |
| Browser — desktop screen readers | ARIA + `<dialog>` + live regions (`VoiceOver+Safari`, `NVDA/JAWS`+`Chrome/Firefox`) | Accessible names on every control, `role="status"` live region for pack flow, native dialog focus containment | Built — verify | VoiceOver on macOS is the reference screen reader for the test plan; one TalkBack spot check on Android is desirable because mobile is the main audience device. |
| Browser — OS preference media queries | `prefers-reduced-motion`, `forced-colors`, `prefers-contrast`, `color-scheme: dark` | Reduced motion fully honoured (CSS + JS); dark-only scheme declared | Built — verify reduced motion; forced-colors unassessed | Site is dark-only by design; verify it degrades acceptably under Windows high-contrast/forced-colors (no invisible text), but no dedicated high-contrast mode is committed. |
| Browser — zoom & responsive | CSS fluid layout, `clamp()`, `svh` units | Usable at 200% zoom, 320–1920px widths, no horizontal overflow (PRD F17) | Built — verify | Joins the overflow test matrix. |
| iOS / Android native accessibility APIs | UIAccessibility / AccessibilityService | — | N/A | No native apps; what matters is delivered through the web rows above. |

---

## Per-Feature Accessibility Matrix

> When a feature is added (e.g. the upload/moderation page of PRD §10.4), add a row
> here. A feature with an unaddressed accessibility concern is not done.

| System | Visual Concerns | Motor Concerns | Cognitive Concerns | Auditory Concerns | Addressed | Notes |
|--------|----------------|---------------|-------------------|------------------|-----------|-------|
| **Pack Generation** (seal button, `P`, draw) | Seal art is decorative (`aria-hidden`); button has explicit label in current language | 44px+ target; `P` shortcut guarded against modifiers | One obvious primary action; progress visible on the same screen | Rip has dialog+announcement equivalent | Partially — reset-confirm finding is adjacent (album tools), draw itself is clean | Disabled state during opening must be announced (`opening` label swap exists) |
| **Reveal Theatre** (sachet tear, card ascend, confetti) | Sachet/teal tear, card-ascend and confetti all killed under reduced motion (CSS + JS gating) | No interaction required during reveal; dialog interactive throughout | Cards appear in numbered order; nothing expires | Ticks/chimes paired with visible card appearance | Built — verify | Canvas + confetti are `aria-hidden`; announcements carry the content |
| **Collection & Sets** (collection grid, progress, collected state) | Collected / not-yet-collected needs the text markers verified on tiles; no color-only completion signal | Tiles are buttons — check 44px in 2-col mobile grid | "Von vorn" needs confirmation (BLOCKING); progress bar is ARIA-labelled | None (silent feature) | Partially — reset confirmation missing | Long collection (200+ photos, PRD OQ2): lazy-loaded thumbs help motor/attention; consider keyboard paging review |
| **Milestones & Unlocks** (full-circuit restart announcement, progress line) | Completion is text (`set.complete.announce`), not a color tick — keep it that way | — | Restart is announced (`live.lap.restart`) and explained in the progress line | None | Built — verify | No unlock mechanics exist; this row covers the set-completion moment only |
| **Chase Card** (rarity per photo, holo promotion, foil) | Rarity = label + stars + foil; color alone never decides | Foil tilt is pointer-driven but harmless without a pointer; reduce-motion disables spring | "Holo guaranteed per pack" is stated in the lede | Chime paired with rarity label | Built — verify in Coblis | Foil must not obscure the photo's subject (rare = Elsa herself) at small sizes |
| **Collection tile → Card flip** (aria-pressed flip) | Front/back state announced (`cardFrontAnnounce`/`cardBackAnnounce`) | `F` key + Enter/Space + tap; target size check | Flip hint persists in accessible name | None | Built — verify | |
| **Card Detail & Share** (card dialog, save, share, deep link) | `card__copy` at 9–11px on small viewports — raise or declare decorative (OQ); close button 42px | `←`/`→` navigate, `F` flips, Escape closes; 42px close needs +2px | Share status is transient-but-safe (nothing actionable); deep link is restorable via URL | None | Partially — text-size decision open | Focus return after *card* dialog close to be verified |
| **Photos Pipeline** (PHP list / photos.json / HEIC conversion) | Broken/failed HEIC decode must degrade to the readable frame, not an empty card (PRD R7) | Owner workflow is desktop drag-and-drop — owner is the collector persona, out of visitor scope | Empty state explains itself in the right language (F15) — verify screen-reader announcement of the empty state | None | Built — verify | Visitor-side error states are content, not chrome |
| **Persistence** (localStorage: lang, sound, collected set) | — | — | The collected set survives reload; reset is the only destructive op → confirm it; storage failure falls back gracefully (German default, code comment at index.html:37) | None | Partially | No cookies — consistent with the privacy promise; nothing to consent to |
| **i18n** (COPY.de/COPY.en, live switch) | Every string switches including `aria-label`s, `<title>`, `og:locale` | — | Language switch is announced via live region; `lang` attributes set so screen readers switch pronunciation | — | Built — verify | QA checks 0 untranslated strings (PRD M4); a11y strings must be in that check, not just visible copy |

---

## Accessibility Test Plan

| Feature | Test Method | Test Cases | Pass Criteria | Responsible | Status |
|---------|------------|------------|--------------|-------------|--------|
| Text contrast ratios | Automated — contrast checker (e.g. WebAIM, axe) on computed styles of every text/background pair, all breakpoints | `--ink`/`--muted`/`--quiet`/`--accent` on `--bg`, `--bg-raised`, `--surface`, `--surface-light`, over card photos, in dialogs; focus ring against its surroundings | All body text ≥ 4.5:1; large text ≥ 3:1; focus ring and meaningful borders ≥ 3:1. Any hand-computed value in this doc is replaced by the measured one. | ux-designer | Not started |
| Colorblind safety | Manual — Coblis simulation on screenshots (stage, pack dialog, full card, collection) in Protanopia, Deuteranopia, Tritanopia | Rarity identification, collected / not-yet-collected tiles, share success/failure, primary buttons in every mode | No information is lost in any mode; rarity and collected state are identifiable without color discrimination | ux-designer | Not started |
| Keyboard-only walkthrough | Manual — unplug the mouse, complete the whole flow | Open pack with `P` and with Enter on the seal; Tab through all controls in DOM order; `←`/`→`, `F`, `Escape` in both dialogs; skip link; focus return on dialog close | Every action completable by keyboard alone; visible focus at all times; no trap; focus returns sensibly | qa-tester | Not started |
| Screen reader pass | Manual — VoiceOver on macOS (Safari) as reference; one TalkBack (Android Chrome) spot check | Pack open, per-card announcements, flip, restart, language switch, share status, empty state, no-JS notice, `aria-pressed` on toggles | All controls have accessible names in the current language; pack flow announcements arrive in order; dialogs contain focus and announce their titles; nothing silent that is visible | qa-tester | Not started |
| Reduced motion pass | Manual — enable Reduce Motion (macOS/iOS/Windows), run the whole flow | Pack reveal, foil layers, confetti, ambient motes, tilt spring, smooth scroll, all transitions | No motion beyond opacity-only fades; all four cards appear at once; content identical to full-motion mode; sounds still function | qa-tester | Not started |
| Touch target audit | Manual — measure controls at 320/390/414px widths | Lang toggle, sound toggle, nav link, pack seal, collection tiles, dialog close, action buttons | Every interactive target ≥ 44×44px (or hit area padded to it); no adjacent-target mis-taps | qa-tester | Not started |
| Zoom & overflow pass | Manual — browser zoom 200% at 1280px; widths 320–1920 (PRD F17 matrix) | Stage, pack dialog, card dialog, collection grid | No clipped or overlapped text; no horizontal scroll; dialogs remain fully operable | qa-tester | Not started |
| Bilingual a11y pass | Manual — toggle DE/EN mid-session with screen reader on | Every `aria-label`, announcement, rarity label, hint, `<title>` | Zero English-garbled German announcements or vice versa; `lang` attribute updates propagate to pronunciation | qa-tester | Not started |
| Reset confirmation check | Manual — tap "Von vorn" | Confirm step appears; Escape/cancel preserves the collected set | No one-tap destructive wipe; clearing is announced | qa-tester | Not started |

---

## Known Intentional Limitations

> Every entry here is a risk — assessed honestly.

| Feature | Tier Required | Why Not Included | Risk / Impact | Mitigation |
|---------|--------------|-----------------|--------------|------------|
| In-app text scaling beyond browser zoom | Comprehensive | A Standard-tier solo-maintained page should not rebuild what the browser provides | Low-vision visitors get browser/OS zoom, not an in-app slider | Fluid `clamp()` layout tested to 200% zoom; no fixed-px containers that would clip |
| Dedicated high-contrast mode | Comprehensive | Dark-only art direction; Comprehensive-tier feature | Windows forced-colors could render the site poorly | Verify forced-colors doesn't produce invisible text; the palette is already high-contrast (ink ≈16.7:1 on bg) |
| Colorblind filter modes (Protan/Deutan/Tritan toggles) | Comprehensive (per studio ladder) | Nothing on the page encodes information in color exclusively; filters would simulate a problem the design doesn't have | A future feature could quietly reintroduce color-only signaling | This document's color-as-only-indicator audit + Coblis test gate every new feature |
| Gamepad / adaptive controller support | Standard (native games) | Web page with tap/click/keyboard interactions; no Gamepad API usage | Switch-access users rely on the browser's own keyboard surface | Full keyboard completeness is committed; revisit if any pointer-only interaction ever appears |
| Input remapping | Standard (native games) | Six bindings, no conflicts, no remappable game actions | None realistically | `P` is the only non-standard binding and is modifier-guarded; never add bindings that shadow browser/AT shortcuts |
| AAA contrast on decorative card-print text | Exemplary | Card replica text (serial, print lines) is intentionally tiny to look like a printed trading card | Decorative only — all content is in the accessible name | Keep essential copy (name, caption) above the AA floor; formal decision in Open Questions |
| Independent volume channels / mono audio | Basic / Comprehensive | Binary optional feedback only; output is mono WebAudio | None — muting loses nothing | Toggle exists, persists, is `aria-pressed`-announced; every sound has a visual/announcement equivalent |
| WCAG 2.2 conformance claim without an external audit | Exemplary | No budget, no consultant | A conformance claim we cannot certify | Target stated honestly as "WCAG 2.2 AA as commitment"; test plan + audit history are the evidence; no legal claim is made |

---

## Audit History

| Date | Auditor | Type | Scope | Findings Summary | Status |
|------|---------|------|-------|-----------------|--------|
| 2026-11-22 | accessibility-specialist + owner | Requirements authoring (code review of `index.html`, `app.js`, `style.css`; not a full audit) | Project-wide | Committed Standard tier. Two BLOCKING findings recorded as requirements: (1) `--quiet` hint text likely below 4.5:1 — measure and fix; (2) `resetLap()` destructive without confirmation. Open: card micro-text sizing, 42px close button. | Requirements committed; first full audit pending |

---

## External Resources

| Resource | URL | Relevance |
|----------|-----|-----------|
| WCAG 2.2 | https://www.w3.org/TR/WCAG22/ | The governing standard (PRD §5); adds Focus Appearance (2.4.13) and Target Size (Minimum, 2.5.8) over 2.1 |
| WebAIM Contrast Checker | https://webaim.org/resources/contrastchecker/ | Confirms the palette values in this document with a measured, citable result |
| Coblis Color Blindness Simulator | https://www.color-blindness.com/coblis-color-blindness-simulator/ | Simulates the three modes on screenshots for the colorblind-safety test |
| MDN — ARIA live regions | https://developer.mozilla.org/docs/Web/Accessibility/ARIA/ARIA_Live_Regions | Pattern reference for the announcement system |
| MDN — `<dialog>` accessibility | https://developer.mozilla.org/docs/Web/HTML/Element/dialog | Native focus containment and Escape behavior the pack/card dialogs rely on |
| WebAIM — VoiceOver on macOS guide | https://webaim.org/articles/voiceover/ | Test procedure for the reference screen reader |
| Game Accessibility Guidelines | https://gameaccessibilityguidelines.com | Cross-checks for the tier ladder, even though most native-game rows are N/A here |

---

## Open Questions

| Question | Owner | Deadline | Resolution |
|----------|-------|----------|-----------|
| WCAG 2.1 vs 2.2: the studio framework defaults to 2.1 AA; the PRD commits to 2.2 AA. Adopted 2.2 AA here (superset, and 2.5.8/2.4.13 directly govern touch targets and focus). Confirm this stands. | owner | 2026-12-06 | Adopted 2.2 AA in this document (2026-11-22) — confirm or overrule |
| `--quiet` is likely below 4.5:1 for 11px hints. Darken the token, or promote hint strings to `--muted`? Measured values decide. | owner + ux-designer | before next upload | Open |
| Card replica text at 9–11px (`card__print`, small-viewport `card__copy`): raise the floor in the full-card dialog, or formally declare card-print text decorative? | owner + ux-designer | before next upload | Open |
| Reset ("Von vorn") confirmation: native `<dialog>` confirm, or press-again-to-confirm on the button? | owner | with the contrast fix | Open |
| `lightbox__close` at 42px: bump to 44px, or pad the hit area? | ui-programmer | with the touch audit | Open |
| Focus return after the *card* dialog closes: back to the originating tile (like the pack button) — confirm intended target and implement if missing. | ui-programmer | before next upload | Open |
| TalkBack (Android) spot check: one session desirable since phones are the family's main device — schedule alongside the family test (PRD M5) or drop to desktop-only testing? | owner + qa-tester | next test session | Open |
