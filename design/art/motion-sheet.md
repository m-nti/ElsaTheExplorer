# Motion Sheet: The Reveal Camera

> **Status**: Draft (motion language) · **Owner**: art-director · **Last Updated**: 2026-11-22
> **Refines**: `art-bible.md` §1 (light rations attention), §7 (motion feel), §8 (styling authority) · **Links**: `pack-opening.md` (screen spec), `interaction-patterns.md` (patterns), `sound-bible.md` (events), `design/accessibility-requirements.md` (Standard)
> **Scope**: the *vocabulary* of motion only — principles, camera, tokens, per-surface rules, reduced motion, performance. What the screen holds, says and when it unlocks lives in `pack-opening.md`. On **timing or movement**, this sheet wins; on **layout, order and copy**, the screen spec wins.
> **Canon**: a pack is **4 cards**. The reveal is **one card in focus, then the next, then a camera pull-back** into 2 × 2 (mobile) or one row (desktop). The old "all cards horizontally at once" reveal is withdrawn, not tuned.

---

## 1 · Principles

1. **One hero motion per moment.** At any instant exactly one thing may move at hero scale: the camera *or* a card *or* a dialog. Everything else is still or a ≤140 ms legibility swap. Two hero motions at once is a bug, not a flourish.
2. **Motion reveals, never decorates.** Every move must end with something newly legible (a card, a grid, a face). A move whose end state is identical to its start state is deleted. The one licensed decoration is the confetti burst (§4) — licensed once per pack, holo only.
3. **Camera moves are motivated.** The camera exists to answer "where is my attention now?". It moves only when the focus card changes or the set becomes the subject — never to fill a pause, never on scroll, never idle.
4. **Nothing bounces for its own sake.** Monotonic curves only in the reveal: no overshoot, no elastic, no wobble. Springiness in this product belongs to *foil under the pointer* (physics on a material), never to layout, camera or cards.
5. **Reduced motion is a first-class composition.** The reduced-motion frame is the *final frame of the choreography*, laid out deliberately — not a degraded leftover. It must be beautiful before it is compliant.
6. **Silence is a motion state.** The pull-back's last 120 ms has no sound and no secondary movement. The archive does not applaud itself.

## 2 · Camera model

One virtual camera: **scale + translate** on a single stage wrapper. Cards inside carry no camera transform; the camera is never baked into card CSS.

`transform: translate3d(var(--cam-tx), var(--cam-ty), 0) scale(var(--cam-scale)); transform-origin: 0 0`

**Closeness `c ∈ [0,1]`.** `c = 1` is the focus frame (one plate on the table); `c = 0` is the overview (the accession as a set). Only those two values are *composable* — the intermediate `c` is transit and may not be a resting layout. Focus index `i ∈ {0..3}`, `-1` = before the first beat. Two states only: `focus(i)` and `overview`.

| Axis | Allowed | Forbidden |
| --- | --- | --- |
| `scale` | `1.00` ↔ `--elsa-cam-focus` | idle breathing, drift, zooming past focus, zoom-out before the first card |
| `tx` / `ty` | **solved** per focus card from the anchor | hand-tuned values; pan without a focus change |
| rotate / skew / z | never | orbit, tilt, shake, handheld |

- **Solved, not tuned.** `tx/ty` is the exact vector that puts the focused plate's **window centre** on the stage anchor **50% / 42%** — the same 42% as `object-position: center 42%`, so the reading line never shifts between focus and overview. Any literal that is not that solution is a defect.
- **Focus scale is derived, not chosen.** The focused plate's short edge fills **74%** of the stage's short edge, clamped `[1.25, 2.40]`; the number is measured at build time per breakpoint (2 × 2 ≈ 1.9, one row ≈ 1.3) and stored as `--elsa-cam-focus`. Do not eyeball it.
- **Pull-back curve.** `c(τ) = 1 − ease-pullback(τ)`, monotonic, no overshoot: fast release, long deceleration — a dolly coming to rest, not a rubber band. Tiles travel on the same clock **offset +12%**, so they settle just after the camera does; the last 120 ms is stillness.
- **Emotional map.** `c = 1` = intimacy: one entry, one reader, the plate is the room. `c = 0` = ownership: "this is what I acquired", a contact sheet (mobile) or a shelf row (desktop). The pull-back is the only place the product says *set* rather than *card*; it is therefore allowed to be the longest move in the product (760 ms).
- **Hand-off overlap.** The next card begins entering when the camera is **65%** through its move; the previous card is never animated out — the camera simply leaves it behind. Nothing exits backwards.

## 3 · Timing & easing tokens

Authored in `design/tokens/motion.ts`, emitted as `--elsa-*`, consumed in card/surface CSS via `var()` only (art-bible §8). Runtime camera values use the separate `--cam-*` namespace and are written inline; they are computed, never tokens.

| Token | Value | Curve | Consumers | Rule |
| --- | --- | --- | --- | --- |
| `--elsa-dur-fade` | 140 ms | `--elsa-ease-out` | state swaps, button/icon changes | opacity only |
| `--elsa-dur-settle` | 220 ms | `--elsa-ease` | hover lift, press, focus ring | existing `--speed`, kept |
| `--elsa-dur-cardin` | 300 ms | `--elsa-ease-soft` | card entering the focus frame | transform + opacity |
| `--elsa-dur-focus` | 380 ms | `--elsa-ease-focus` | camera, focus → focus | never with a card-in-motion |
| `--elsa-dur-tile` | 260 ms | `--elsa-ease-soft` | card travelling to its grid cell | runs inside the pull-back |
| `--elsa-dur-pullback` | 760 ms | `--elsa-ease-pullback` | camera, `c: 1 → 0` | **the only move > 700 ms** |
| `--elsa-dur-dialog-in` | 200 ms | `--elsa-ease-out` | dialog open (scale 0.98 + fade) | opacity + transform |
| `--elsa-dur-dialog-out` | 160 ms | `--elsa-ease-in` | dialog close | faster than it opens |
| `--elsa-dur-flip` | 420 ms | `--elsa-ease-flip` | card front/back (`rotateY`) | never during a camera move |
| `--elsa-dur-flourish` | 520 ms | `--elsa-ease-out` | milestone glint, one pass | static geometry after |
| `--elsa-dur-capstone` | 520 ms **per element** | `--elsa-ease-soft` | capstone sequence (overlapping parts) | total ≤ 1.1 s; no single element longer |
| `--elsa-hold-beat` | 260 ms | — | minimum dwell on a settled focus card | before the next camera move |
| `--elsa-stagger-tile` | 40 ms | linear interval | grid entrance, max 4 items | ≤ 160 ms total, forward only |
| `--elsa-stagger-line` | 60 ms | linear interval | text lines, max 3 | never on re-entry |
| `--elsa-overlap` | 35% | — | next card starts at 65% of a camera move | hides the seam, not the cause |

Curves: `--elsa-ease` `cubic-bezier(.2,.8,.2,1)` · `--elsa-ease-out` `cubic-bezier(.25,.8,.3,1)` · `--elsa-ease-soft` `cubic-bezier(.16,.84,.24,1)` · `--elsa-ease-focus` `cubic-bezier(.22,.9,.24,1)` · `--elsa-ease-pullback` `cubic-bezier(.16,1,.3,1)` · `--elsa-ease-in` `cubic-bezier(.4,0,1,1)` · `--elsa-ease-flip` `cubic-bezier(.3,.7,.2,1)`. No curve in the reveal may overshoot (`y > 1`).

**Stagger rules.** Forward only; max 4 items; skipped on re-entry, reopen and back-navigation (those are instant); the last staggered item must settle before input unlocks — nothing is actionable mid-flight.

**Clock budget.** 4-card default reveal ≈ **2.8 s** wall clock, hard ceiling **3.2 s** (card-in + holds + 3 camera moves + pull-back + tile settle), measured on a mid-tier phone. A beat that needs more than its token is cut, not stretched.

**Scope note.** The wrapper theatre (sachet, tear, flash) precedes the reveal and is *not* in this sheet's vocabulary: it keeps its feel and stays timed by `pack-opening.md` §10 until that spec is rewritten. This sheet governs everything from the first card entering focus.

## 4 · Motion vocabulary by surface

| Surface | Motion | Moves | Duration / curve | Forbidden |
| --- | --- | --- | --- | --- |
| **Reveal — focus beat** | Card rises into the focus frame, settles; camera holds | `translateY` 6%→0, `scale` .96→1, opacity 0→1 | `--elsa-dur-cardin` / soft | rotate, blur, foil sweep on top of it, sound before settle |
| **Reveal — camera move** | Dolly to the next focus card; previous left behind | camera `scale`+`translate` only | `--elsa-dur-focus` / focus | simultaneous card entrance (use `--elsa-overlap` at 65%), any exit animation |
| **Pull-back** | `c: 1 → 0`; cards travel to grid cells | camera + per-card `translate`/`scale` | `--elsa-dur-pullback` / pullback, tiles +12% | confetti *during* the move (it fires only after the last tile settles), flash, per-card sound, overshoot |
| **Celebration (holo pull only)** | One small canvas burst, gravity settle, then gone | canvas paint + trailing opacity fade | ≤ 1.2 s, no loop | more than once per pack, during the pull-back, on an ordinary pull, on a tile entrance, on a milestone |
| **Card flip** | `rotateY` ±180°, `translateZ` lift mid-flip | transform only, `preserve-3d` on wrapper | `--elsa-dur-flip` / flip | flip during camera move; both faces legible at once |
| **Tile entrance** | 8 px lift-in + fade into its cell | `translateY`, opacity | `--elsa-dur-tile` / soft, 40 ms stagger | scale, layout shift, stagger > 4 |
| **Dialog open / close** | Glass case lifts: scale 0.98→1, veil fades | transform + opacity (veil opacity only) | 200 / 160 ms | animating blur radius, springy scale, backdrop parallax |
| **Milestone flourish** | One glint pass across static geometry, then still | opacity/`background-position` step | `--elsa-dur-flourish` | scale-in, confetti, looping, page-scale |
| **Capstone** | Sequence: stamp, then glint, then one line, then the **larger celebration** | each part transform/opacity; canvas | parts ≤ 520 ms, overlapping | one long animation, camera move, shake, a party that outranks the certificate |

## 5 · Reduced motion (`prefers-reduced-motion: reduce`)

| Surface | Becomes | Must NOT be stripped |
| --- | --- | --- |
| Reveal | **No camera, no focus sequence, no confetti.** All 4 cards render directly in their grid slots, as the pull-back's final frame | reading/DOM order (holo last), the "1 von 4" counter, the fact that these are four distinct finds |
| Pull-back | Does not exist — the overview is simply the layout | the set reads as a set; no "where did they go" moment |
| Card flip | Instant swap, or ≤100 ms cross-fade; no 3D | front/back state and its label |
| Tile entrance | None — cells are filled at first paint | the arrival is still visible as *presence* + announcement |
| Dialog | ~100 ms fade; no scale | focus movement into the dialog, the veil |
| Foil | Static at centre (`--px/--py = 50`, band at rest), opacity ≤ 0.3 on motion layers | rarity as **texture + chip label + star count** (art-bible §4) |
| Sound | Rip and rustle skipped; **one soft tick at t = 0**; no per-card ticks, no chime | the state change itself; the arrival announcement |
| Milestone / capstone | Final state only, no glint | stamp geometry, text, live-region announcement |

Rule: under reduced motion **no information may be carried by a movement that no longer happens**. Where the choreography was the only carrier of a fact, the layout or a label carries it instead — in the same commit.

## 6 · Performance rules

- **Transform and opacity only.** No animation of `width`, `height`, `top`, `left`, `margin`, `filter`, `box-shadow` or `background-position` on a large surface. Glint sweeps are an opacity step on a pre-positioned layer.
- **One camera, one compositor layer.** The stage gets `will-change: transform` for the duration of the sequence only, removed on `animationend`/state settle. `contain: layout paint` on the stage; never `will-change` on 4 cards at once.
- **Measure once, before the sequence.** All geometry reads happen at start (single `getBoundingClientRect` batch); no layout reads inside the animation or in a rAF loop.
- **No scroll-linked motion, ever.** No `filter` animation while scrolling; no `backdrop-filter` radius animation (veil opacity only).
- **60 fps on a 2019 mid-tier phone**, ≥ 8 ms of headroom per frame during the pull-back; a dropped-frame in the pull-back is a release blocker, not a polish item.
- **Camera scale cap 2.40** — above it the scaled paint area costs more than the intimacy is worth. Beyond the cap, shrink the card, not the room.
- **Confetti is one short canvas job.** ≤ 1.2 s, fixed particle cap, no per-frame allocation, loop stops and the canvas unmounts at the end. It starts only after the last tile settles, and never under reduced motion.

## 7 · Sound coupling

1. **One beat, one ear.** A landing sound fires on the card's **settle frame**, never on its start — eye and ear must agree on the instant the card is *there*.
2. **The camera is silent.** A pull-back has no sound, no swell, no air. The overview is conveyed by layout; adding a whoosh would make the camera an event instead of a viewpoint.
3. **Rip is skipped under reduced motion** (sound-bible §a11y rule); the single tick carries the layout.
4. **No sound without a visible counterpart.** A sound with nothing to look at is deleted; a visual with no sound is fine (silence is a legitimate state).
5. **Never queue.** A sound may not delay the next card's mount or the announcement; dispatch is fire-and-forget.
6. **Sound never re-choreographs motion.** If a cue would land off-beat, move the cue, not the card. Timing authority is this sheet; the sound bible schedules inside it.

## 8 · What NOT to do

- **Simultaneous dumps** — four cards appearing at once in the default path. That is the withdrawn reveal, and it is the reduced-motion composition only.
- **Parallax on text.** Type is printed matter; it does not slide under a moving camera. Ever.
- **Confetti as a default.** One small burst, **once per pack, only when a holo is present**, ≤ 1.2 s — and the capstone's larger celebration is the only other licensed use. No burst on an ordinary pull, a tile entrance or a milestone.
- **Camera shake, punch-in, handheld drift.** The archive is a tripod.
- **Long queues of micro-animations** (card → chip → star → shadow, each 200 ms). One hero + at most one support per moment; if the queue is needed to be noticed, the composition is wrong.
- **Motion on the photograph.** Nothing animates inside the window or its 2 cqw halo (art-bible §3, §5).
- **Idle motion during the reveal** — no breathing cards, no drifting motes fade-in, no looping foil. The reveal's only loop is the reader's eye.

## 9 · Document drift to fix in the build phase

- `pack-opening.md` §5–§10 still specifies **five cards**, a 200 ms stagger and an all-at-once reduced-motion state; its motion rows are superseded here, its layout/copy/state content is not (four cards).
- `interaction-patterns.md` Animation Standards keeps the 200 ms reveal stagger and 700 ms ascend as SSOT; that SSOT moves to this sheet's tokens.
- `art-bible.md` §7 now cites this sheet as the SSOT for motion values and states the four-card reveal (aligned 2026-11-22); its §1/§7 *intent* (one lit object, one hero motion) is unchanged.
- **Confetti is settled:** a single small burst (≤ 1.2 s) once per pack when a holo is present; the capstone gets the larger celebration; nothing else. `pack-opening.md` must carry that number and replace the "big burst ~1900 ms" row when it is rewritten.
