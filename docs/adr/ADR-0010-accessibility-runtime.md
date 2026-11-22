# ADR-0010: Accessibility runtime — two live regions, one announcer, one focus-return map, one motion gate

- **Status**: **Accepted (owner decision, 2026-11-22 — the owner delegated the remaining decisions: `docs/decisions.md` intro and D-08)**
- **Deciders**: owner (final), technical-director (author), accessibility-specialist (owner: assistive behaviour, screen-reader support matrix), ux-designer (owner: interaction patterns)
- **Review**: accessibility-specialist (domain review), `cs-accessibility-engineer` (cross-check), `cs-architecture-reviewer` (cross-document consistency)
- **Amends**: `docs/architecture.md` — the "Accessibility Architecture" table and the `a11y/announcer.svelte.ts` / `a11y/motion.svelte.ts` sketch under "Stores"; `design/accessibility-requirements.md` — the "Keyboard completeness" skip-link target (superseded by `design/copy/copy-deck.md` §11 D17) and the share-status row's carrier; `design/copy/copy-deck.md` §8 — the region count and the share-status owner; `design/ux/interaction-patterns.md` — the share-status carrier (Share Button, "Live Region Announcement") and the tilt module's motion source; `design/ux/card-detail.md` — the status line is plain text; `design/ux/stage-landing.md` — `#stage` gains `tabindex="-1"` and the empty CTA becomes genuinely `disabled`; `docs/test-plan.md` — E-KBD-01's skip-link wording and E-FOC-13's re-render paths
- **Related**: `ADR-0006` (gates, coverage floor, document precedence), `ADR-0001` (pinned stack), `ADR-0003` (closed key register), `ADR-0002` (typed tokens, `:focus-visible` ring, enforcement belt), `ADR-0009` (offline/update announcements), `ADR-0005` (typed dictionary)

## Context

The Standard tier is committed and every screen already specifies its own accessibility
behaviour: four UX specs carry an `## 12. Accessibility` section with a focus order, an
announcement table and reduced-motion rows (`stage-landing`, `pack-opening`, `card-detail`,
`binder`). What none of them can own is the **runtime** —
the one place where a message is written, the one place that remembers which control opened a
dialog, and the one place that answers "is motion reduced right now". Those three objects are
cross-screen by construction, and the corpus already gives more than one answer to each:

| Question | What the documents say today | The disagreement |
| --- | --- | --- |
| Who writes announcements | `interaction-patterns` §"Live Region Announcement": *one shared live element*. `architecture.md`: *one polite + one assertive region in `App`*. `copy-deck` §8: *the single `role="status"` region*. `stage-landing` §12 names a region `#live` | Three descriptions, one region id, and no rule for who may use the assertive half |
| Where a dialog returns focus | `interaction-patterns` §"Focus Trap (Dialog)": a `lastTrigger` store. `architecture.md`: an `opener` prop on the dialog. `test-plan` §6.4: a 15-row matrix (E-FOC-01…15) | Three carriers (store, prop, test) for one fact |
| The skip link | `copy-deck` §11 D17: `#open-pack`, *"STG wins"*, the matrix row *"predates the reframe"*. `accessibility-requirements.md` "Keyboard completeness": `#stage` | Two targets for one link |
| Reduced motion | `motion-sheet` §5 and `interaction-patterns` "Motion reduction overrides" (CSS media query); `architecture.md` (a `motion` store, JS) | Two mechanisms with no stated rule that keeps them in step |
| Error wording | `interaction-patterns` §"Error State" (copy principles), `copy-deck` §0.4.4 (no `!` in an accessibility string), §11 D26 (the one string that carries one) | Correct in three places, owned by none — so a fourth can be minted by accident |

None of this exists in code yet (`src/lib/a11y/` is a planned path in `architecture.md`'s folder
tree, not a module). This is the cheapest possible moment to fix the contract, and the failure
modes are specific rather than theoretical:

- a live region created in the same frame as its first message is **not announced** by several
  screen readers — the node must exist, empty, at first paint;
- a polite write issued during a 160 ms dialog close is **lost**, so the "deliberate skip"
  line has to be written before the close starts (`pack-opening` §12; asserted by E-LIVE-06);
- focus returned to `<body>` strands a keyboard visitor at the top of the document (E-KBD-05);
- four per-card writes inside 2.4 s already sit at the edge of what a screen reader can voice
  (`pack-opening` §12, "Pacing risk, flagged"), so any change that adds a queue makes it worse.

`docs/test-plan.md` asserts the outcomes (E-JRN, E-KBD-*, E-RM-*, E-FOC-*, E-AXE-*). This ADR
fixes the runtime that can satisfy them.

## Decision

### 1. Exactly two live regions, mounted once, outside every conditional

| Region | Markup | Politeness | Writers | Message class |
| --- | --- | --- | --- | --- |
| `#live-status` | `<div id="live-status" role="status" aria-atomic="true">` | implicit `polite` | `announcer.say(message)` | every row of `design/copy/copy-deck.md` §8 |
| `#live-alert` | `<div id="live-alert" role="alert" aria-atomic="true">` | implicit `assertive` | `announcer.say(message, { mode: 'assertive' })` | critical-only; **zero call sites today** |

Both mount as children of `App.svelte`'s root element, siblings immediately before `<main>`,
rendered once on first paint and **empty** — that is their *home*, not their fixed position (§1
relocates them into an open dialog). Rules, each of which has a failure behind it:

- **Home: `App`'s root, outside every `<dialog>`, `{#if}`, `{#each}` and `{#key}` block.** Nothing
  unmounts them. The app has no router: "navigation" is a `?photo=` `replaceState` patch, the
  `Nach Räumen` view toggle, and `showModal()` on `<dialog>` elements that are always in the DOM.
  A region that is destroyed and rebuilt loses the announcement it holds and can miss the next
  one; `{#key}` on the app root is therefore forbidden.
- **While a modal is open, the same two nodes are relocated into that dialog** by
  `announcer.follow(dialog)` (§2), and `announcer.release()` returns them home on `close` — a modal
  `<dialog>` makes everything outside it inert to assistive technology, so a document-level region is
  *not* reliably announced while one is up. The document home is the resting place, not the delivery
  place. **Node identity never changes**: `follow` is one `append`, not a re-creation, so the region
  is never empty-and-new, and a marker set on the node before the dialog opens is still there after
  it closes (E-LIVE-11). (Nested case: the lightbox over the pack dialog — the regions follow the
  **topmost** dialog and come back to the pack dialog when it closes, because that dialog is then the
  topmost.)
- **Write before `showModal()`, always.** Every announcement that reports a modal *opening* (the
  pack-open line, the card-open line) is written while the region is still document-level and live;
  the dialog is shown after the write, in the same task. This is the primary rule because it needs
  no relocation at all, and it is why `live.pack.open` is specified "before the theatre".
- **Never write to an inert region.** The store asserts (dev builds) that the target region is
  connected and has no `[inert]` ancestor and no closed-dialog ancestor; a violation is a console
  error naming the message, so a swallowed announcement is a test failure rather than a silent one.
- **Fallback if a browser still swallows an in-modal write** (recorded, not assumed away): the
  state already has its visible text carrier inside the dialog — the `i von n` counter, the card
  face and its rarity chip, the share status line — so the fact survives even when the utterance
  does not, and the close-path line is written before the close starts (E-LIVE-06). The
  VoiceOver/NVDA pass in `design/accessibility-requirements.md`, "Accessibility Test Plan" is what
  promotes this from a fallback to a verified fact; until it runs, §8's rows are `NOT ASSESSED`
  against a real screen reader.
- **Hidden by clipping only** (the `sr-only` recipe: 1 px box, clipped, `position: absolute`).
  Never `display: none`, `visibility: hidden`, `hidden`, or `aria-hidden` — each removes the node
  from the accessibility tree and silences it while leaving axe green.
- **Never focusable and never in the tab order**: no `tabindex`, no interactive content, text only.
- `aria-atomic="true"` on both, so the whole message is read rather than the changed fragment.
- **The only `aria-live` / `role="status"` / `role="alert"` in the codebase.** Gate: an ESLint
  `no-restricted-syntax` rule fails any of the three outside `src/App.svelte`. A per-component
  region is the failure mode this section exists to prevent.
- The `#live` id used by `stage-landing` §12 is this polite region, renamed `#live-status`;
  `#live` is retired rather than kept as an alias, because two ids for one region is how a second
  writer appears.

### 2. Announcer: replacing writes, one admission gate, no timer

`src/lib/a11y/announcer.svelte.ts` is the only module that touches a region.

```ts
export type AnnounceMode = "polite" | "assertive";

export class AnnouncerStore {
  say(message: string, opts?: { mode?: AnnounceMode; key?: string }): void;
  clear(opts?: { mode?: AnnounceMode }): void;
  follow(dialog: HTMLDialogElement): void; // move both nodes into the topmost open dialog
  release(): void;                         // move them back to their home in App
}
```

`architecture.md` sketched `say(message, mode)`. The second parameter becomes an options object —
a third positional argument for the dedupe key would be unreadable at the call site — and `mode`
defaults to `polite`, the only mode with call sites. `follow` / `release` are the *only* way a
region's parent changes: the dialog component calls them on open and close, no component appends a
region itself, and `release` is idempotent so a double `close` event cannot strand a node inside a
detached dialog.

| Rule | Behaviour | Why |
| --- | --- | --- |
| **Replacing, never queueing** | a new message overwrites the region's text node immediately; nothing is buffered, nothing is delayed | Ratified twice: `interaction-patterns` §"Live Region Announcement" ("rapid successive messages replace, never queue") and `copy-deck` §8 preamble. A queue would read four card names seconds after the pack closed |
| **Ordering** | last write wins, in call order; the store never reorders and never merges two messages into one | the per-card beats and the authoritative `pack.summary` are already designed as "every line complete, the summary restates the haul" (`pack-opening` §12), so a dropped line loses nothing — merging would break that property |
| **Identical-text re-announce** | when the incoming text equals the current text, the store blanks the region and writes again on the next animation frame (one hop, no timer) | screen readers announce a *change*; repeating an identical string is otherwise silent. The real case is a second reset in one session (`live.reset.done` twice) |
| **Dedupe** | a `key` (default: the rendered message) suppresses a repeat of the same key within the same task; a different key always wins instantly | protects against a `click` + `keydown` double-fire on one control without delaying a genuinely new message |
| **Clear timing: no timer** | a message stays until replaced or until an explicit `clear()` (used only by reset-to-first-visit and by test helpers) | a timeout that fires mid-utterance truncates the sentence; an empty region is silent anyway, so time-based clearing buys nothing and costs a cut-off message |
| **Language** | the message is rendered in the current locale at write time and never cached pre-rendered | `copy-deck` §8; F8. A cached English string read after a switch is the defect this forbids |
| **No `!` on the announcement path** | `say()` applies the terminal `!` → `.` neutralisation once, before the write | `copy-deck` §0.4.4 forbids `!` in an accessibility string; §11 D26 makes the announcement path a render-time transform, not a second key. One choke point means a new announced key cannot reintroduce it |
| **Assertive admission** | `mode: 'assertive'` writes `#live-alert` and is legal only for a failure the visitor must act on **and** cannot discover otherwise. Today: zero call sites | `interaction-patterns`: "Critical-only events (none today) — do not reach for it casually." An assertive write interrupts the utterance in progress; using it for the pack flow would cut off the card being read. Adding a caller needs a `copy-deck` §8 row **and** a review note |
| **Message shape** | ≤ 2 sentences, complete sentences, no abbreviations, never raw exception text, HTTP status or file names | `copy-deck` §8 "Max" column; an exception message is English inside a German page |
| **Ownership** | components call the store; they never touch a region and never build an announcement string by hand where a deck key exists | two writers are two voices |
| **One carrier per event** | an event that has a visible status line is *either* announced by the store *or* rendered as a live status, never both. Share success/failure is **announced here**; its visible status line (`design/accessibility-requirements.md`, "Share/copy success & failure") keeps the same text as a plain element with no live semantics | two `role="status"` carriers speak one sentence twice — the requirements' share row and `copy-deck` §8 `live.share` both fire on the same event, and a second region would also contradict the single-region gate in §1 |

The regions ship empty and the assertive one ships **unused on purpose**: retrofitting a second
region after 20 announced events is what breaks the events, and an empty region costs two nodes.

### 3. Focus: one opener map, one return function, one matrix

`src/lib/a11y/focus.svelte.ts` owns the opener map (`Map<SurfaceId, HTMLElement>`);
`focus.ts` owns the DOM helpers (`focusFirst(dialog)`, `restoreFocus(surface, fallback)`).

| Surface | Opener captured | Focus on open | Focus on close |
| --- | --- | --- | --- |
| Pack dialog | the element that invoked `openPack()` (stage CTA, seal) — or none, for the `P` path | the `<dialog>` element, so its `aria-labelledby` title is announced; first `Tab` reaches ✕ | the captured opener; `P`-invoked → `#open-pack` |
| Card lightbox | the pack card or the collection tile that opened it | the `<dialog>` element, so the card is announced first | that exact button; else the pack dialog's ✕; else `#open-pack` |
| Card lightbox via deep link `?photo=` | nothing — no opener exists | the `<dialog>` element | `#open-pack` |
| Reset confirmation | the "Von vorn" button | the **Cancel** button (safer default) | "Von vorn" |
| Diplom | its opener (pack trigger or the progress area) | the `<dialog>` element | the captured opener, `#open-pack` as fallback |
| Any open dialog, content re-rendered (`←`/`→` card step) | — | focus **stays on the `<dialog>` element**; it never chases the new content (E-FOC-14) | — |

**Re-render with no dialog open or closed** — one behaviour per path, so each one can fail:

| Path | What is replaced | Focus outcome | Row |
| --- | --- | --- | --- |
| Language switch (page, dialog or grid) | the focused node itself | re-anchor to the node with the same `data-focus-id` | E-FOC-13 |
| View toggle (`Alle Karten` ↔ `Nach Räumen`) | the grid; the toggle button is **not** replaced | focus stays on the toggle; if a **tile** held focus, re-anchor to the tile with the same `data-focus-id` | E-FOC-13 |
| Error entry (manifest failure) | the collection region | focus is **not moved**; if the focused node was inside the replaced region, it takes ladder rung 3 (`#stage`) | E-FOC-17 |
| Reset confirmed | the dialog closes, the collection re-renders behind it | focus returns to the "Von vorn" trigger and stays there; nothing inside the re-rendered grid is focused | E-FOC-11 |

**The identity key is `data-focus-id`.** Its value is the photo id for tiles and cards,
`state.<key>` for state messages, and the control's stable id otherwise. "Re-anchor" means query
`[data-focus-id="<same value>"]` once and focus it; if the node is gone, focus is **not** moved —
except on the error path, which falls through the ladder. No other attribute, class or index is an
identity: a positional index re-anchors to the wrong card after a language switch re-orders nothing
today and a manifest refresh re-orders everything tomorrow.

- **Capture at intent, not at open.** The pack flow disables the trigger and then reveals over
  ~4 s; reading `document.activeElement` when the dialog finally opens returns the dialog.
- **Restore in a microtask after the native `close` event.** `<dialog>`'s own focus reset runs on
  close and wins otherwise (`interaction-patterns` §"Dialog Open / Close"; asserted by E-FOC-15).
- **Every close path calls the same function**: ✕, `Escape`, backdrop, mid-reveal skip, and the
  "Noch ein Pack" chain. There is no second return mechanism and no `opener` prop.
- **Last intent wins.** One pending target, never a stack: the "Noch ein Pack" chain closes the
  lightbox and reopens the pack surface within ~160 ms, and focus must land inside the reopened
  pack surface, not on the page (E-FOC-09).
- **`<body>` is never a legal target; the fallback is a ladder, not one id.** `restoreFocus` has no
  zero-argument form and validates the candidate before focusing it — connected, not `disabled`,
  not inside `[inert]`, not `display:none`. A candidate that fails drops to the next rung:

  | Rung | Target | Why it is here |
  | --- | --- | --- |
  | 1 | the captured opener | the visitor's own place |
  | 2 | `#open-pack` | always present, natively focusable — **except** in the empty state, where E-ERR-07 makes it `disabled` |
  | 3 | `#stage` (`tabindex="-1"`, never in the tab order) | a disabled button cannot take focus, so the only legal single fallback would dead-end on `<body>` — the failure E-KBD-05 forbids |

  Rung 3 is exactly the `#stage` target the old accessibility matrix mentioned; it is the *focus
  fallback*, not the skip link's destination (§5). Depth is capped at three: a chain longer than
  this is a surface that never had a place.
  **Rung 2 is genuinely unreachable in exactly one state and must stay that way:** the empty
  collection (`stage-landing` §5.3, "the CTA is genuinely `disabled`"), where closing the reset
  confirmation lands on `#stage` (E-FOC-16). `aria-disabled` would leave the trigger focusable and
  make rung 3 dead code — that is why the empty CTA is `disabled`, not styled as such. The other
  case that disables the trigger is the opening lock, and there the **ordering is a requirement**:
  a mid-reveal close clears `opening` before the microtask restore, so the trigger is enabled again
  and rung 2 succeeds (E-FOC-05). A close that restores before releasing the lock would send the
  visitor to `#stage` from a pack they can immediately reopen.
- **The trap is native.** `<dialog>` + `showModal()` only — no library, no polyfill, no
  `div` overlay (`interaction-patterns` §"Dialog Open / Close"). Documented fallback: if the
  Safari ≤ 15 verification in `interaction-patterns` "Open Questions" fails, the minimal trap
  lives inside `focus.ts` behind the same API — one replacement point, never a per-component trap.
- **Announcements never move focus, and a focus move is never announced as if it were a state
  change** (`pack-opening` §12: "no separate line — card 1's own accessible name is read on focus").
- **Reduced motion changes no focus target and no focus timing.** The `inert` reveal window
  (`pack-opening` §12) is the pack dialog's own concern; the focus manager owns only the return.

### 4. Motion: one store for JS, the media query for CSS, nothing else reads either

`src/lib/a11y/motion.svelte.ts`:

```ts
export class MotionStore {
  reduce = $state(false); // from matchMedia('(prefers-reduced-motion: reduce)'), live-updated
}
```

- Initialised from `matchMedia('(prefers-reduced-motion: reduce)')` and kept live by its `change`
  listener, so a preference toggled mid-session is picked up without a reload (E-RM-09). Guarded
  for absence (`typeof matchMedia !== "function"` → `false`) so the Vitest node project can
  import the module.
- **Exactly one `matchMedia('(prefers-reduced-motion…)` call in the source tree**, in that file.
  Gate: an ESLint `no-restricted-properties`/`no-restricted-syntax` rule scoped to **`src/`** —
  `legacy/` is the frozen v1 tree (`legacy/assets/js/app.js`, `legacy/scripts/qa.mjs`) and is
  excluded so the gate does not fail on code nobody ships.
- **Every JS reader consumes the store — including the tilt spring.** `use:tilt` and `lib/tilt.ts`
  read `motion.reduce` and never `matchMedia`;
  `design/ux/interaction-patterns.md`'s Card Tilt implementation note is amended by this ADR to say
  so (it previously instructed the module to read `matchMedia` itself — the reviewer's finding).
  A second reader is a second source, and the two disagree exactly when it matters: a preference
  toggled while the lightbox is open (E-RM-09).
- **CSS keeps the media query; JS reads the store.** They are two readers of one OS fact, not two
  sources, and they cannot disagree because neither derives from the other: CSS answers for CSS,
  the store answers for JS. What must not exist is a **third** opinion — the store may not write a
  class or `data-` attribute that drives CSS. A class would make JS the source for CSS and
  re-introduce exactly the drift this section removes (plus a flash for the first paint).
- **No persisted override.** An in-app motion toggle is a Comprehensive-tier item
  (`design/accessibility-requirements.md`, "Known Intentional Limitations"), and `ADR-0003`'s key
  register is closed — a `lucky-elsa.motion.v1` key would need a line there and an ADR. Adding one
  is a new decision, not a component option.
- **Reduced mode is the same state machine at its final beat, not a second code path.** The reveal
  machine starts at `settled` on open; there is no parallel renderer, no `if (reduce) renderX()`
  branch around different markup. This is what makes the motion rows testable instead of hopeful.

What each surface does in reduced mode (canonical: `design/art/motion-sheet.md` §5;
`interaction-patterns` "Motion reduction overrides" restates it for the pattern library.
The `pack-opening` copy of this table is marked superseded by `motion-sheet` §9, so §5 alone is
cited):

| Surface | In reduced mode | What must survive |
| --- | --- | --- |
| Pack reveal | all four cards in their final grid at first paint — the pull-back's last frame | DOM order still puts the highest-rarity card last (E-RM-04) |
| Sachet theatre, camera, focus beats, pull-back, confetti | do not play; the stage is never `inert` | the counter reading `4 von 4`, the fact that these are four distinct finds |
| Dialog open / close | ~100 ms opacity fade, no scale | focus moving into the dialog; the veil |
| Card flip | instant swap or ≤ 100 ms cross-fade, no 3D | which face is showing, and its label + `aria-pressed` |
| Tilt and foil: pointer tilt, spring, idle sway, glare sweep | fully static — `--px`/`--py` at 50, band at rest, motion layers at **opacity ≤ 0.3**; the `↑`/`↓` tilt keys become a no-op (§5) | rarity as texture + chip word + star count (E-RM-03) |
| Ambient motes, tile entrance, milestone glint, progress fill | no motion; static or instant | the arrival is still visible as presence **and** as an announcement |
| Smooth scrolling | `scroll-behavior: auto`; scroll-into-view jumps | the focused element is still scrolled into view |
| Sound | rip and per-card ticks skipped; one soft tick at t = 0; no chime | motion ≠ sound (E-RM-10) |
| Announcements | unchanged — opening, summary, restart, every §8 row | E-RM-05 |

The governing rule for the runtime is `motion-sheet` §5's: **no information may be carried by a
movement that no longer happens.** For this ADR that means every announcement that fires in full
motion fires in reduced motion, and the reduced path is the same machine — not a quieter copy.

### 5. Keyboard: one map, one listener, no per-component bindings

`src/lib/a11y/keys.ts` holds the whole table and one pure resolver:

```ts
resolveShortcut(input: { key: string; modifiers: boolean; scope: Scope; inGrid: boolean;
                         typing: boolean; hasPhotos: boolean; opening: boolean;
                         reduce: boolean }): Action | null
```

`App.svelte` holds the single `svelte:window on:keydown` and executes the returned action
(`interaction-patterns` §"Keyboard Shortcut" implementation notes: one handler, scope branches,
never a listener per element).

| Scope | Key | Action | Guard |
| --- | --- | --- | --- |
| page | `P` | `openPack()` | no dialog open, not typing, no modifiers, photos exist, not already opening |
| card dialog | `F` | flip the exhibit | dialog open, not typing |
| card dialog | `←` / `→` | `navigateCard(±1)` — card focus irrelevant | dialog open, ≥ 2 photos |
| card dialog | `↑` / `↓` | tilt the foil, 7° steps, clamped | dialog open **and `reduce === false`** — under reduced motion the keys are a no-op, not a small movement |
| collection grid | `←` `→` `↑` `↓` | `move(dx, dy)` on the grid — geometry-based | focus is inside the grid |
| collection grid | `Home` / `End` | first / last tile | focus is inside the grid |
| any dialog | `Escape` | nothing — return `null` | the platform closes the dialog |

`Enter` and `Space` are deliberately **not in the table**: they act through the browser's own click
path on the focused `<button>`, and the resolver returns `null` for them instead of binding a second
time. A runtime that re-implements activation is a runtime that can break it.

- **The grid registers a move handler; it does not bind keys.** It is a composite widget
  (`interaction-patterns`, roving grid) and it is the only thing that knows its geometry, so
  `use:rovingGrid` exposes `move()` and the resolver calls it. The *binding* still exists in one
  table, which is the property that matters: one file answers "what does this key do".
- **No type-ahead, ruled out.** Typing letters over the grid does nothing: card names are a
  proper-noun vocabulary in two languages, there is no addressable index to jump into, and a
  type-ahead would need a visible editing affordance to be discoverable. Arrows, `Home`/`End` and
  `Tab` are the whole in-grid map (§7 records the omission as a non-goal).
- Guards live in the resolver, not in components: modifier keys abort; typing context aborts
  (`input`, `textarea`, `select`, `contenteditable` — it ships before the upload page of PRD §10.4
  exists, because retrofitting that guard is how a shortcut starts eating a typed letter);
  `Escape` is never intercepted.
- Nothing is shortcut-only (`interaction-patterns`: "every shortcut is redundant"). `R` is bound
  to nothing, by design, including `Shift+R` (E-KBD-08, E-RST-09).
- **Skip link: target `#open-pack`, label `nav.skip` ("Direkt zum Pack" / "Skip to the pack").**
  This restates `copy-deck` §11 D17 rather than minting a new ruling: D17 records that
  `stage-landing` §12 wins over the accessibility matrix row because "A11Y row predates the
  reframe", and the label/destination agreement is the principle that decides it. The link is the
  first focusable element in DOM order and becomes visible on `:focus-visible`. This change also
  corrects the two documents that still disagreed: `design/accessibility-requirements.md`'s
  "Keyboard completeness" row now reads `#open-pack` (with `#stage` named as the §3 focus
  fallback), and `docs/test-plan.md` E-KBD-01 now reads "focuses `#open-pack`, the stage's pack
  trigger". `#open-pack` is a real `<button>`, so it is natively focusable and needs no
  `tabindex="-1"`; `#stage` keeps `tabindex="-1"` only so the §3 fallback has somewhere to land.

### 6. Errors: one wording source, polite only, never a modal

- **Error copy is a deck key, never a runtime string.** Exception text, HTTP status, file names and
  stack traces never reach a region or an `aria-label`; the load-failure line is the one ratified
  by `docs/decisions.md` D-05 and `copy-deck` §7 ("no `!`"). An English exception inside a German
  announcement is the specific defect this forbids.
- **Errors are announced politely, never assertively**, and are announced **once per state entry**
  — not per render, not per retry (`announcer` dedupe keyed by the state name).
- **The announcement is never the only carrier.** Every error state also renders its text visibly
  (`copy-deck` §0.4.11: "every state change has a text carrier"), so a visitor who never hears the
  region still reads the same sentence.
- **Silent degradations stay silent.** A manifest fallback and a failed HEIC decode write nothing
  (`interaction-patterns` §"Error State": "silent failures show nothing"); announcing a fallback
  the visitor cannot act on is noise.
- **No error modal exists**, so no error can ever need `role="alert"` (`interaction-patterns`
  §"Error State": "never block the experience with an error modal").

### 7. What this architecture deliberately does not do

| Not done | Why | Authority |
| --- | --- | --- |
| A custom screen-reader-only framework: off-screen text mirrors, `role="application"`, hand-rolled composite roles | Semantic HTML plus one composed accessible name per card already reads correctly (`card-detail` §12: the card's `aria-label` composes its face so nobody Tab-walks six nodes). A mirror duplicates every announcement and drifts from the visible text | `card-detail` §12, `interaction-patterns` roving-grid notes ("no `role="grid"`") |
| A runtime accessibility overlay or toolbar: contrast switcher, font-size slider, read-aloud | Comprehensive-tier features, excluded by name; the browser and the OS already provide zoom, forced colours and screen reading. An overlay is a second, weaker copy of them | `design/accessibility-requirements.md`, "Known Intentional Limitations" |
| An in-app motion preference, and a persisted key for it | The OS preference is the only input; the key register is closed | `ADR-0003` §2, `design/accessibility-requirements.md` tier rationale |
| A queued / prioritised / scheduled announcer, or an announcement history | A queue contradicts the ratified replacing rule and would read stale beats long after the surface changed | `interaction-patterns` §"Live Region Announcement", `copy-deck` §8 |
| Per-component live regions, `aria-live` outside `App.svelte`, or a re-created region as a "force re-announce" trick | Re-creation is exactly what loses an announcement; the store's blank-then-write handles the identical-text case | this ADR §1–§2 |
| A second `role="status"` on a visible status line (share success/failure) | One event speaks once; the store is the voice and the line is the text carrier | this ADR §2, `copy-deck` §8 |
| Type-ahead over the collection grid (type a name to jump) | Card names are a two-language proper-noun vocabulary with no addressable index, and a type-ahead nobody can see is undiscoverable. Arrows, `Home`/`End` and `Tab` are the whole in-grid map | this ADR §5; **E-KBD-11 is its regression guard** — letter keys over the grid must stay a no-op, so a future "convenience" type-ahead is a deliberate decision with a failing test, not a silent arrival |
| A focus-trap library, a `<dialog>` polyfill, or a `div`-based modal | One modal primitive, therefore one focus contract; natives give containment, `Escape` and the backdrop for free | `interaction-patterns` §"Dialog Open / Close" |
| Announcements for decoration — foil, frames, stamps, confetti, milestone outfits | "Decoration never becomes a second voice" | `copy-deck` §8, "Not announced, by decision" |
| Any claim of certified conformance | axe is a regression gate, not a certificate; the audit history is the evidence | `design/accessibility-requirements.md`, "Known Intentional Limitations" final row; `ADR-0006` §3 gate 8 |

### 8. Verification hooks — every decision names the test that proves it

**Status: `NOT ASSESSED` against a screen reader.** Every row below is a structural, textual or
unit assertion; none has been run against a real VoiceOver (Safari) or NVDA session, and axe cannot
judge whether a message was *spoken*. The `Screen reader pass` row of
`design/accessibility-requirements.md`, "Accessibility Test Plan" is what converts these rows from
"the DOM is right" to "the visitor heard it"; until it runs, no row may be reported as passed in a
review — the honest status is `NOT ASSESSED`, not green.

Not every row carries that reservation, and saying which is the difference between honesty and
noise: the rows that assert DOM structure, attributes or pure-function output (`E-LIVE-01`,
`E-LIVE-07`, `E-LIVE-11`, `E-LIVE-12`, `E-LIVE-13`, `E-A11Y-01`, `U-KEYS-01…03`, `U-A11Y-01`/`02`,
both grep gates) can be reported green on their own. Every row that claims a message was *spoken*
or an ordering an utterance depends on (`E-LIVE-02`, `E-LIVE-03`, `E-LIVE-04`, `E-LIVE-06`,
`E-LIVE-08`, `E-LIVE-09`, `E-JRN-05`) stays `NOT ASSESSED` until the manual pass.

Existing IDs are `docs/test-plan.md` rows. IDs marked **(new)** are added by the story that
implements the module, per `ADR-0006` §7 ("each story ships its tests and evidence"); this ADR is
their source until then.

| Decision | Named behaviour | Mechanism | ID |
| --- | --- | --- | --- |
| §1 | Exactly two live regions at first paint, both empty, both `aria-atomic`, hidden by clipping only | count `[aria-live], [role=status], [role=alert]`; `textContent === ""`; computed `display` ≠ `none` | E-LIVE-01 **(new)** |
| §1 | Their home is the app root, as siblings of `<main>` — neither starts inside a `<dialog>` | structural assertion on the initial DOM | E-LIVE-07 **(new)** |
| §1 | While a modal is open, `#live-status` is a descendant of `dialog[open]` — relocation happened, so it is not inert | open the pack dialog → `expect(region).toBeInside(dialog[open])` | E-LIVE-02 **(new)** |
| §1 | The relocation preserves node identity: a marker set before opening is still on the same node after closing | `el.__probe = 1` before open; after `close`, `expect(await handle.evaluate(n => n.__probe)).toBe(1)` | E-LIVE-11 **(new)** |
| §1 | On close the regions are released home: `#live-status`'s parent is the app root again | parent assertion after the dialog's `close` event | E-LIVE-12 **(new)** |
| §1 | A dialog-opening announcement is written **before** `showModal()`: the region is still document-level when its text changes | `MutationObserver` on the region vs the moment the dialog gains `open` | E-LIVE-08 **(new)** |
| §2 | Four per-card writes inside one reveal end with the summary as the region's text; no backlog is read afterwards | golden journey | E-JRN-05 |
| §2 | A second identical message in one session is still announced (blank-then-write) | reset twice; two non-empty writes recorded | E-LIVE-03 **(new)** |
| §2 | One control fired twice in one task produces one write | Vitest unit against a fake region, `key` dedupe | U-A11Y-01 **(new)** |
| §2 | No message is cleared by time: after 30 s (fake clock) the region text is unchanged | Vitest unit | U-A11Y-02 **(new)** |
| §2 | No `!` reaches a region | error/share announcement assertions | E-ERR-12 |
| §2 | The visible line keeps its `!` while the region's copy loses it | i18n string test | U-I18N-17 |
| §2 | The assertive region is never written — not on the golden journey, not on the share path | after the journey, `#live-alert` has never had a child text node | E-LIVE-04 **(new)** |
| §2 | The mid-reveal skip line is written **before** the close begins, so the 160 ms close cannot outrun it | pack suite: skip mid-reveal, region text sampled at the start of the close | E-LIVE-06 **(new)** |
| §2 | After a share success, `#live-status` carries the `card.share.shared` string | text assertion on the region only | E-LIVE-09 **(new)** |
| §2 | The visible share status line exposes no live semantics | one predicate — `role === null && aria-live === null` — asserted on the status line | E-LIVE-13 **(new)** |
| §3 | All 15 open-path × close-mechanism rows return focus to the named target, restored after the native close reset | `tests/e2e/focus-return.spec.ts` | E-FOC-01…15 |
| §3 | A mid-reveal close releases the opening lock **before** the microtask restore, so focus lands on `#open-pack` (rung 2), not `#stage` | `focus-return.spec.ts`, skip mid-reveal, assert `#open-pack` is enabled at the restore tick | E-FOC-05 |
| §3 | Empty fixture: `#open-pack` is `disabled`; closing the **reset confirmation** (`#reset-lap` → `ResetConfirmDialog`) lands focus on `#stage`, never `<body>` | `focus-return.spec.ts` with the empty-manifest fixture: open reset, `Esc`, `document.activeElement` is `#stage` | E-FOC-16 **(new)** |
| §3 | Stepping cards inside the lightbox keeps focus on the dialog element; it never chases the content | `focus-return.spec.ts` | E-FOC-14 |
| §3 | A language switch, or a view-toggle re-render with a tile focused, re-anchors to the node carrying the same `data-focus-id` | `focus-return.spec.ts`, both paths | E-FOC-13 |
| §3 | Error entry moves no focus; when the focused node was inside the replaced region it lands on `#stage` | `focus-return.spec.ts`, both sources mocked failing while a tile holds focus | E-FOC-17 **(new)** |
| §3 | Focus never lands on `<body>` anywhere in the flow | keyboard journey | E-KBD-05 |
| §4 | `matchMedia('(prefers-reduced-motion` occurs in exactly one file under `src/` (`legacy/` excluded) | grep / ESLint gate, `src/` scope, inside `npm run verify` | gate **(new)**, `tests/unit/ci-gates.test.ts` |
| §4 | An OS preference change mid-session is picked up live (store and CSS) | `emulateMedia` change | E-RM-09 |
| §4 | Reduced mode is the settled frame at open — no theatre, no stagger | reduced-motion suite | E-RM-01 |
| §4 | No rAF-driven animation survives: no sachet, no confetti, no stagger delays | `getAnimations()` on the drop row | E-RM-02 |
| §4 | Every foil/motion layer sits at computed `opacity ≤ 0.3` and its transform equals the rest matrix, sampled twice 500 ms apart, with no `--px`/`--py` mutation between samples | `emulateMedia({ reducedMotion: 'reduce' })` + two `getComputedStyle` reads per layer | E-RM-03 |
| §4 | Every announcement that fires in full motion still fires in reduced motion | reduced-motion suite | E-RM-05 |
| §4 | Same cards, names and rarities as full motion | reduced-motion suite | E-RM-08 |
| §5 | Every binding resolves through one table; no `on:keydown` outside `App.svelte` except the grid's `move()` registration | Vitest table test + grep gate | U-KEYS-01 **(new)** |
| §5 | `↑`/`↓` over the open exhibit returns no tilt action when `reduce === true` | Vitest resolver table, reduced state | U-KEYS-02 **(new)** |
| §5 | `↑`/`↓` over the open exhibit returns the tilt action (7°, clamped) when `reduce === false` | Vitest resolver table, full-motion state | U-KEYS-03 **(new)** |
| §5 | The skip link is the first Tab stop, its label equals its destination, activating it focuses `#open-pack` | `tests/e2e/keyboard.spec.ts` §6.2 | E-KBD-01 |
| §5 | The whole journey is completable without a pointer | keyboard suite | E-KBD-10 |
| §5 | No type-ahead: letter keys over the grid move nothing (regression guard for §7's non-goal) | keyboard suite, grid focused | E-KBD-11 **(new)** |
| §6 | The load-failure state announces exactly once, in the current language, with no `!` | error suite | E-ERR-04, E-ERR-11 |
| §6 | The failure state's text is visible, not only announced | error suite | E-LIVE-05 **(new)** |
| §6 | A silent degradation (manifest fallback, HEIC decode) writes nothing to either region | error suite, region text unchanged across the fallback | E-LIVE-10 **(new)** |
| §7 | No overlay, toolbar, `role="application"` or SR-only mirror exists: `[data-a11y-overlay]`, `.a11y-toolbar`, `#a11y-widget`, `[role="application"]` all absent on every surface | `a11y.axe.spec.ts` negative DOM assertion | E-A11Y-01 **(new)** |

## Consequences

**Positive** — one module answers each runtime question, so a screen spec can describe behaviour
without inventing a mechanism; the focus-return matrix becomes a signature (`restoreFocus` with a
mandatory fallback) rather than a discipline; reduced motion becomes one state machine with a
different start state instead of a parallel implementation; announcement strings get exactly one
choke point for language and for the `!` rule; and every claim in this ADR has a row in §8 that can
fail.

**Negative / accepted costs** — two nodes that move: every dialog open/close is one `append` for
each region, so a future second modal surface must call the same helper or the regions stay outside
and go quiet; a move can interrupt an utterance in progress, which is why the dialog-opening line is
written *before* `showModal()` rather than after (§1); the blank-then-write frame is a visible
timing rule to anyone reading the store; the dev-only inert assertion costs a `closest()` walk per
write; the ESLint gates (`matchMedia`, `aria-live`) are new rules that will occasionally need a
reasoned exemption, which is the point; the assertive region ships unused and a reviewer will ask
why (§2 answers it); and this ADR carries four documents with it (`accessibility-requirements.md`
share-status carrier and skip-link target, `stage-landing.md`'s `#live` placement,
`interaction-patterns.md`'s tilt note, `test-plan.md` E-KBD-01) — corrected in the same change, not
frozen into tests (`ADR-0006` §2).

## Performance Implications

Two empty DOM nodes, one `matchMedia` listener, one window `keydown` listener, and text-node writes
— no `requestAnimationFrame` loop in steady state, no `MutationObserver` in production, no polling,
no dependency. The runtime is a few hundred lines of TypeScript against the `ADR-0006` §4 JS budget
(≤ 60 KB target, 100 KB cap gzip); the announcer and focus modules are in the always-loaded shell and
must stay there, because a lazily imported announcer that arrives after the first pack is the defect
this ADR exists to prevent. The keyboard resolver is pure and runs once per keystroke.

## Alternatives Considered

| Alternative | Why rejected |
| --- | --- |
| Per-component live regions | More than one writer means more than one voice; two regions announcing one state change is a defect axe cannot see, and each component would need its own language and `!` handling. |
| A queued announcer with priorities and a drain timer | Contradicts the ratified replacing rule, reads beats after the surface has changed, and turns a 2.4 s reveal into a 10 s monologue. |
| One `role="alert"` region only | Interrupts the utterance in progress for routine state changes; the pack flow would cut off the card being read. |
| Two regions but the assertive one added later, "when a critical event exists" | Retrofitting a region breaks the announcements that already exist — the node must be present and empty before the message. Two nodes cost nothing now. |
| `display: none` / `visibility: hidden` for the hidden region | Removes the node from the accessibility tree: silent, and axe passes. Silently wrong is the worst kind of green. |
| Timer-based clearing (e.g. 3.4 s, matching the share status line) | Truncates an utterance mid-sentence; an empty region is silent anyway, so the only effect is a lost tail. Auto-dismiss is a *visible* status-line rule, not a live-region one. |
| Re-creating the region to force re-announcement | Loses whatever the region holds and can miss the next write; the blank-then-write hop achieves the same result with no unmount. |
| The motion store as the single source, driving CSS through a class on `<html>` | JS becomes the source for CSS, so a first paint before hydration renders full motion, and every CSS author must trust the store. Two readers of one OS fact is simpler and cannot drift. |
| A persisted in-app "reduce motion" toggle | A Comprehensive-tier feature and a new key in a closed register; it also lets a visitor's choice contradict the OS preference with no rule for which wins. |
| Per-component `on:keydown` handlers | The binding list stops being a list; "what does `P` do" needs a grep. One window listener and one pure resolver also make the bindings unit-testable without a browser. |
| Binding keys inside the collection grid | The grid knows its geometry, not its bindings — it registers `move()` and the table stays in one file. |
| A focus-trap library | Native `<dialog>` already traps; a library re-implements containment, adds bytes, and gives a second return-focus mechanism to keep in sync. |
| An `opener` prop on each dialog | A prop has to be plumbed through three call sites and cannot express "there was no opener" or the "Noch ein Pack" chain; a map keyed by surface can, and the fallback is part of the signature. |
| A skip link to `#stage` | The accessibility matrix row predates the reframe; `copy-deck` §11 D17 records that the screen spec wins and requires label = destination, which `#stage` would violate (the label says "to the pack"). |
| A runtime accessibility overlay (contrast / text size / read-aloud) | Comprehensive tier, excluded by name; the browser and OS already provide the equivalents, and an overlay usually degrades the semantics it claims to add. |
| `alert()` / `confirm()` for errors and reset | Native browser dialogs are outside the design system, unstyleable, not bilingual, and carry no focus-return contract. |

## References

- `design/accessibility-requirements.md` — "This Project's Commitment", "Keyboard completeness", "Reduced motion", "Punctuation and announcements", "Known Intentional Limitations", "Accessibility Test Plan"
- `design/ux/interaction-patterns.md` — "Live Region Announcement", "Focus Trap (Dialog)", "Dialog Open / Close", "Card Reveal Step", "Keyboard Shortcut", "Collection Grid Tile" and its roving-arrows variant, "Motion reduction overrides", "Error State", "Open Questions"
- `design/art/motion-sheet.md` §5 — reduced motion, surface by surface (the canonical table; §9 records the superseded copies)
- `design/ux/pack-opening.md` §12 · `design/ux/card-detail.md` §12 · `design/ux/stage-landing.md` §12 · `design/ux/binder.md` §12
- `design/copy/copy-deck.md` §0.4 (voice law), §7 (states), §8 (announcements), §11 D17 and D26
- `docs/adr/ADR-0006-testing-ci.md` §2 (precedence), §3 (gates), §4 (budgets), §7 (coverage) · `ADR-0003-state-persistence.md` §2 (closed key register) · `ADR-0002-styling-system.md` · `ADR-0009-pwa.md` (offline/update announcements)
- `docs/architecture.md` — "Accessibility Architecture", Stores, Folder Structure · `docs/test-plan.md` §6.2, §6.3, §6.4, §6.10 · `docs/decisions.md` D-05, D-08
