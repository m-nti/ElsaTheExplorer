# ADR-0010: Accessibility runtime — two live regions, one announcer, one focus-return map, one motion gate

- **Status**: **Accepted (owner decision, 2026-11-22 — the owner delegated the remaining decisions: `docs/decisions.md` intro and D-08)**
- **Deciders**: owner (final), technical-director (author), accessibility-specialist (owner: assistive behaviour, screen-reader support matrix), ux-designer (owner: interaction patterns)
- **Review**: accessibility-specialist (domain review), `cs-accessibility-engineer` (cross-check), `cs-architecture-reviewer` (cross-document consistency)
- **Amends**: `docs/architecture.md` — the "Accessibility Architecture" table and the `a11y/announcer.svelte.ts` / `a11y/motion.svelte.ts` sketch under "Stores"; `design/accessibility-requirements.md` — the "Keyboard completeness" skip-link target, superseded by `design/copy/copy-deck.md` §11 D17
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
  line has to be written before the close starts (`pack-opening` §12, E-JRN-09);
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

Both are static children of `App.svelte`'s root element, siblings immediately before `<main>`,
rendered once on first paint and **empty**. Rules, each of which has a failure behind it:

- **Outside every `<dialog>`, every `{#if}`, `{#each}` and `{#key}` block.** A modal dialog makes
  everything outside it inert to assistive technology but a dialog's own messages must still be
  heard; keeping the regions outside the dialog and inside the document is what allows a write
  while a dialog is open. Nothing in the app unmounts them.
- **They survive state changes by never being re-created.** The app has no router: "navigation" is
  a `?photo=` `replaceState` patch, the `Nach Räumen` view toggle, and `showModal()` on `<dialog>`
  elements that are always in the DOM. A region that is destroyed and rebuilt loses the
  announcement it holds and can miss the next one; `{#key}` on the app root is therefore
  forbidden.
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
}
```

`architecture.md` sketched `say(message, mode)`. The second parameter becomes an options object —
a third positional argument for the dedupe key would be unreadable at the call site — and `mode`
defaults to `polite`, the only mode with call sites.

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
| Any open dialog, language switched | — | re-anchor to the replacement node, keyed by identity | — |

- **Capture at intent, not at open.** The pack flow disables the trigger and then reveals over
  ~4 s; reading `document.activeElement` when the dialog finally opens returns the dialog.
- **Restore in a microtask after the native `close` event.** `<dialog>`'s own focus reset runs on
  close and wins otherwise (`interaction-patterns` §"Dialog Open / Close"; asserted by E-FOC-15).
- **Every close path calls the same function**: ✕, `Escape`, backdrop, mid-reveal skip, and the
  "Noch ein Pack" chain. There is no second return mechanism and no `opener` prop.
- **Last intent wins.** One pending target, never a stack: the "Noch ein Pack" chain closes the
  lightbox and reopens the pack surface within ~160 ms, and focus must land inside the reopened
  pack surface, not on the page (E-FOC-09).
- **`<body>` is never a legal target.** `restoreFocus` has no zero-argument form; a close path
  with no opener must name its fallback, and the only permitted fallback is `#open-pack`. This is
  the E-KBD-05 invariant, enforced by the signature rather than by discipline.
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
- **Exactly one `matchMedia('(prefers-reduced-motion…)` call in the codebase**, in that file.
  Gate: an ESLint `no-restricted-properties`/`no-restricted-syntax` rule outside it.
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

What each surface does in reduced mode (canonical: `design/art/motion-sheet.md` §5, restated in
`interaction-patterns` "Motion reduction overrides" and `pack-opening` §10.3):

| Surface | In reduced mode | What must survive |
| --- | --- | --- |
| Pack reveal | all four cards in their final grid at first paint — the pull-back's last frame | DOM order still puts the highest-rarity card last (E-RM-04) |
| Sachet theatre, camera, focus beats, pull-back, confetti | do not play; the stage is never `inert` | the counter reading `4 von 4`, the fact that these are four distinct finds |
| Dialog open / close | ~100 ms opacity fade, no scale | focus moving into the dialog; the veil |
| Card flip | instant swap or ≤ 100 ms cross-fade, no 3D | which face is showing, and its label + `aria-pressed` |
| Foil, tilt spring, idle sway, glare sweep | fully static at centre | rarity as texture + chip word + star count |
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
                         typing: boolean; hasPhotos: boolean; opening: boolean }): Action | null
```

`App.svelte` holds the single `svelte:window on:keydown` and executes the returned action
(`interaction-patterns` §"Keyboard Shortcut" implementation notes: one handler, scope branches,
never a listener per element).

| Scope | Key | Action | Guard |
| --- | --- | --- | --- |
| page | `P` | `openPack()` | no dialog open, not typing, no modifiers, photos exist, not already opening |
| card dialog | `F` | flip the exhibit | dialog open, not typing |
| card dialog | `←` / `→` | `navigateCard(±1)` — card focus irrelevant | dialog open, ≥ 2 photos |
| card dialog | `↑` / `↓` | tilt the foil, 7° steps, clamped | dialog open |
| collection grid | `←` `→` `↑` `↓` | `move(dx, dy)` on the grid — geometry-based | focus is inside the grid |
| collection grid | `Home` / `End` | first / last tile | focus is inside the grid |
| any dialog | `Escape` | nothing — return `null` | the platform closes the dialog |

- **The grid registers a move handler; it does not bind keys.** It is a composite widget
  (`interaction-patterns`, roving grid) and it is the only thing that knows its geometry, so
  `use:rovingGrid` exposes `move()` and the resolver calls it. The *binding* still exists in one
  table, which is the property that matters: one file answers "what does this key do".
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
  first focusable element in DOM order and becomes visible on `:focus-visible`. Consequence: the
  "Keyboard completeness" row in `design/accessibility-requirements.md` (which still says `#stage`)
  is a stale line to correct, and the e2e assertion pins `#open-pack` — E-KBD-01's "moves focus to
  the stage" is read as "moves focus to the stage's pack trigger". `#open-pack` is a real
  `<button>`, so it is natively focusable and no `tabindex="-1"` target is needed.

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
| A focus-trap library, a `<dialog>` polyfill, or a `div`-based modal | One modal primitive, therefore one focus contract; natives give containment, `Escape` and the backdrop for free | `interaction-patterns` §"Dialog Open / Close" |
| Announcements for decoration — foil, frames, stamps, confetti, milestone outfits | "Decoration never becomes a second voice" | `copy-deck` §8, "Not announced, by decision" |
| Any claim of certified conformance | axe is a regression gate, not a certificate; the audit history is the evidence | `design/accessibility-requirements.md`, "Known Intentional Limitations" final row; `ADR-0006` §3 gate 8 |

### 8. Verification hooks — every decision names the test that proves it

Existing IDs are `docs/test-plan.md` rows. IDs marked **(new)** are added by the story that
implements the module, per `ADR-0006` §7 ("each story ships its tests and evidence"); this ADR is
their source until then.

| Decision | Named behaviour | Mechanism | ID |
| --- | --- | --- | --- |
| §1 | Exactly two live regions exist at first paint, both empty, both `aria-atomic`, both hidden by clipping only, neither inside a dialog | `tests/e2e/a11y.live.spec.ts`: count `[aria-live], [role=status], [role=alert]`; assert `textContent === ""` before interaction; assert computed `display` ≠ `none` | E-LIVE-01 **(new)** |
| §1 | A write issued **while a dialog is open** still lands in a document-level region | open the pack dialog, trigger the opening line, assert `#live-status` text | E-LIVE-02 **(new)**, E-JRN-02 |
| §2 | Four per-card writes inside one reveal end with the summary as the region's text; no backlog is read afterwards | golden journey | E-JRN-05 |
| §2 | A second identical message in one session is still announced (blank-then-write) | reset twice; a `MutationObserver` records two non-empty writes | E-LIVE-03 **(new)** |
| §2 | One control fired twice in one task produces one write | Vitest unit against a fake region, `key` dedupe | U-A11Y-01 **(new)** |
| §2 | No message is cleared by time: after 30 s (fake clock) the region text is unchanged | Vitest unit | U-A11Y-02 **(new)** |
| §2 | No `!` reaches a region, while the visible line keeps it | existing copy + announcement assertions | E-ERR-12, U-I18N-17 |
| §2 | The assertive region is never written on the golden journey | after the journey, `#live-alert` has never had a child text node | E-LIVE-04 **(new)** |
| §3 | All 15 open-path × close-mechanism rows return focus to the named target, restored after the native close reset | `tests/e2e/focus-return.spec.ts` | E-FOC-01…15 |
| §3 | Focus never lands on `<body>` anywhere in the flow | keyboard journey | E-KBD-05 |
| §4 | `matchMedia('(prefers-reduced-motion` occurs in exactly one source file | grep / ESLint gate inside `npm run verify` | gate **(new)**, `tests/unit/ci-gates.test.ts` |
| §4 | An OS preference change mid-session is picked up live | `emulateMedia` change | E-RM-09 |
| §4 | Reduced mode is the settled frame at open and every announcement still fires | reduced-motion suite | E-RM-01, E-RM-02, E-RM-05, E-RM-08 |
| §5 | Every binding resolves through one table; no `on:keydown` outside `App.svelte` except the grid's `move()` registration | Vitest table test + grep gate | U-KEYS-01 **(new)**, gate **(new)** |
| §5 | The skip link is the first Tab stop, its label equals its destination, activating it focuses `#open-pack` | `tests/e2e/keyboard.spec.ts` §6.2 | E-KBD-01, E-KBD-10 |
| §6 | The load-failure state announces exactly once, in the current language, with no `!`, and its text is visible | error suite | E-ERR-04, E-ERR-11, E-LIVE-05 **(new)** |
| §7 | No overlay, toolbar or `role="application"` node exists in any surface | axe suite + a negative DOM assertion | E-AXE-01…05 |

## Consequences

**Positive** — one module answers each runtime question, so a screen spec can describe behaviour
without inventing a mechanism; the focus-return matrix becomes a signature (`restoreFocus` with a
mandatory fallback) rather than a discipline; reduced motion becomes one state machine with a
different start state instead of a parallel implementation; announcement strings get exactly one
choke point for language and for the `!` rule; and every claim in this ADR has a row in §8 that can
fail.

**Negative / accepted costs** — two always-mounted nodes and a document-level region mean an
announcement is audible while a modal is open, which is right for the pack flow but means a future
surface must think about whether it *should* announce, not just whether it can; the
blank-then-write frame is a visible timing rule to anyone reading the store; the ESLint gates
(`matchMedia`, `aria-live`) are new rules that will occasionally need a reasoned exemption, which
is the point; the assertive region ships unused and a reviewer will ask why (§2 answers it); and the
`#live` → `#live-status` rename plus the skip-link ruling leave two stale sentences in
`design/accessibility-requirements.md` and `design/ux/stage-landing.md` that must be corrected, not
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
- `design/art/motion-sheet.md` §5 — reduced motion, surface by surface
- `design/ux/pack-opening.md` §10.3 and §12 · `design/ux/card-detail.md` §12 · `design/ux/stage-landing.md` §12 · `design/ux/binder.md` §12
- `design/copy/copy-deck.md` §0.4 (voice law), §7 (states), §8 (announcements), §11 D17 and D26
- `docs/adr/ADR-0006-testing-ci.md` §2 (precedence), §3 (gates), §4 (budgets), §7 (coverage) · `ADR-0003-state-persistence.md` §2 (closed key register) · `ADR-0002-styling-system.md` · `ADR-0009-pwa.md` (offline/update announcements)
- `docs/architecture.md` — "Accessibility Architecture", Stores, Folder Structure · `docs/test-plan.md` §6.2, §6.3, §6.4, §6.10 · `docs/decisions.md` D-05, D-08
