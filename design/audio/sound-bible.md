# Sound Bible: Elsa the Explorer

> **Status**: Draft v1 — owner-approved direction (2026-11-22)
> **Owned By**: audio-director · **Specified by**: sound-designer
> **Location**: `design/audio/sound-bible.md` (not `design/gdd/` — GDD checks count every file there as a system GDD)
> **Governing docs**: `design/art/art-bible.md` §1–§3 (mood/light/material), `design/accessibility-requirements.md` (Auditory Accessibility, Gameplay-Critical SFX Audit), `design/ux/pack-opening.md` (locked choreography)
> **Decision of record**: v1 audio stays **fully synthesized Web Audio**. No OGG/MP3 assets, zero bytes transferred, no a11y-doc conflict. Sound is decorative feedback only.

---

## 1. Sonic Identity

**The archive sounds like:** *paper handled carefully in a quiet room.*

| Pillar adjective | What it means in practice |
| --- | --- |
| **Dry** | No reverb tails longer than ~120 ms, no shimmer, no airy pads. The room is small and full of paper. |
| **Archival** | Ticks, taps, rustles, a soft low thump — the sounds of a catalogue being consulted, not of a game rewarding you. |
| **Warm-paper** | Mid-forward, slightly muffled highs (the art bible's "warm ink on cool stock"). Never glassy or metallic-bright. |
| **Hushed** | Every peak sits below the visual moment. The card is the only lit object; audio is the lamp, not the fireworks. |
| **Tactile** | Each event is a *thing touching a thing*: seal press, paper, card stock, lacquer. No abstract UI blips. |

### What it must NOT sound like

- **Not a slot machine / casino**: no ascending jackpot runs on reveal, no coin cascade, no "win" fanfare, no three-note money chime.
- **No cartoon boings**: no pitch-bent spring, no slide-whistle, no comedic "pop".
- **No exclamation-mark energy**: nothing that sounds like `!`. The reveal is *dealt*, not *announced*. Energy ceiling is the art bible's 8/10 (reveal), not 10/10.
- **No horror/liminal ambience**: the dark parlour is warm, not eerie. No drones, no sub-bass rumble, no reverse cymbals.
- **No not-licensed-game stingers**: no orchestral hit, no trailer braam, no EDM riser.
- **No wet/water texture anywhere** (canon: Elsa hates water — a rustle must read as dry paper, never a splash or damp squelch).

### Energy map (from art-bible §2)

Arrival 2/10 → pack anticipation 4→7 → reveal 8 (only high-energy state) → binder 3 → card detail 4 → completion 6 (calm, not bouncy).
Audio follows the same curve: v1 ships **no ambience and no music** (the room is silent until touched).

---

## 2. Audio Event Table

All events are one-shots. "Duration" is the audible envelope, not the scheduled stop time.
Legacy implementation names (`playRip`, `playTick`, `playWin` in `legacy/assets/js/app.js`) map onto the new keys in §6.

| Event key | Trigger | Synthesis recipe · duration | Pri | Reduced motion | Type |
| --- | --- | --- | --- | --- | --- |
| `sfx.pack.seal` | Press of the pack seal / `P` (before the dialog) | Short low thump: sine 90 Hz, 8 ms attack, 90 ms decay; + noise burst bandpass 700 Hz, 30 ms | 3 | Plays (press feedback is essential to feeling the tap) | Required |
| `sfx.pack.rustle` | Sachet appears, dialog opening (0–400 ms of the 900 ms theatre) | Filtered noise, bandpass 1.8 kHz Q 0.8, amplitude wobble 6 Hz; **180 ms** | 3 | **Skipped** | Decorative |
| `sfx.pack.tear` | Rip moment (~400–650 ms into the 900 ms theatre) | Noise, highpass swept 900 → 2800 Hz, Q 0.7, 4 ms attack; **260 ms** (current `playRip` recipe, kept) | 3 | **Skipped** | Decorative |
| `sfx.pack.card-land` | Each card lands (`pack:card-landed`, 200 ms stagger) | One tick: noise, bandpass 2100 Hz Q 1.1, 5 ms attack, **50 ms** (current `playTick`) | 4 | **This is the single soft tick** — fired once at t=0, not per card | Required |
| `sfx.pack.holo-land` | Landing of the rare/holo card (always slot 4 or 5) | Tick + warm triad (triangle 523.25 / 659.25 / 783.99 Hz, 85 ms apart, 280 ms decay each, per-voice gain 0.085) — current `playWin`; add a 400 Hz lowpass on the triad so it reads *paper-lacquered*, not *arcade* | 4 | Single tick only; chime omitted | Decorative (rarity is carried by chip + stars) |
| `sfx.card.flip` | Card front/back toggle (`F`, Enter/Space, tap) | Paper flex: noise 1.2 kHz bandpass Q 1.4, 40 ms + sine 220 Hz 30 ms; **70 ms** | 4 | Plays (direct input feedback) | Required |
| `sfx.dialog.open` | `showModal()` on pack or card dialog | Air/presence: noise lowpass 600 Hz, 8 ms attack, **120 ms**, gain 0.05 | 5 | Plays | Decorative |
| `sfx.dialog.close` | `close()` on either dialog | Same recipe, gain 0.035, **90 ms** | 5 | Plays | Decorative |
| `sfx.catalogue.tick` | Binder tile focus/hover-intent, `←`/`→` card paging | Dry click: noise bandpass 3000 Hz Q 2.0, **18 ms**, gain 0.03 | 5 | Plays (it is the paging feedback, not motion) | Decorative — **throttle: max 1 per 80 ms, 1 per 400 ms per tile** |
| `sfx.set.complete` | All photos in the current set collected | Two-note warm cadence (triangle 392 → 523.25 Hz, 140 ms apart, 500 ms decay), lowpassed 1.6 kHz; **650 ms** | 2 | Plays | Decorative (text "alle … gesammelt" + `lastOneAnnounce` carry it) |
| `sfx.milestone` | Pack-level moment: first holo of a session, or lap restart | Single struck tone, triangle 329.63 Hz, 10 ms attack, **420 ms** decay, gain 0.07 | 2 | Plays | Decorative |
| `sfx.capstone` | Elsas Ehrenmensch / full-catalogue completion (**not built yet**, art-bible state 6) | Low warm plate: sine 196 Hz + 293.66 Hz, 40 ms attack, 900 ms decay, gentle lowpass 900 Hz; **900 ms** (hard cap) | 1 | Plays | Decorative — **spec-ahead** |
| `sfx.reset.confirm` | Confirmation of "Von vorn" (two-step confirm) | Two-part: low thump 90 Hz (as seal) then a dry sweep down 400 → 180 Hz, **300 ms** | 2 | Plays | **Spec-ahead — depends on the planned reset-confirmation fix** (`accessibility-requirements.md`, BLOCKING cognitive finding) |
| `sfx.error` | Share/copy failure, storage write failure, no photos to draw | Dull double tap: noise bandpass 800 Hz, two 40 ms bursts 90 ms apart, gain 0.05; **140 ms** | 2 | Plays | Decorative (status text is the carrier) |

**Priority scale**: 1 = highest (never stolen) … 5 = lowest (stolen first). Nothing here is gameplay-critical; priority exists only to decide voice stealing and mixing.

---

## 3. Mix Rules

### Buses and default levels

Gain is linear (not dB) at the node, expressed here as both.

| Bus | Content | Default gain | ≈ dBFS peak | Notes |
| --- | --- | --- | --- | --- |
| `master` | Everything | 0.50 | −6 | Hard ceiling; limiter after it |
| `bus.ui` | seal, flip, dialog open/close, catalogue tick, error, reset confirm | 0.35 | −9 | Sits under everything else |
| `bus.pack` | rustle, tear, card land, holo land | 0.50 | −6 | The reveal is the loudest *sustained* moment |
| `bus.celebration` | set complete, milestone, capstone | 0.60 | −4 | Short, single-shot; never loops |
| `bus.music` / `bus.ambient` | **none in v1** | — | — | Reserved; adding one requires a mix revision |

Master default is **on** (persisted `lucky-elsa.sound.v2`, default `true`). Off means the graph is never created.

### Ducking

- **v1: no ducking.** There is no music or ambience to duck, and no two buses legitimately overlap for more than 50 ms.
- **Rule if music is ever added**: `bus.music` ducks −9 dB under any `bus.celebration` event, 150 ms attack / 400 ms release; `bus.ui` never ducks anything.
- **Masking avoidance instead of ducking**: keep the buses frequency-separated — UI tick 2.1–3 kHz, pack tear 0.9–2.8 kHz, lands below 250 Hz, celebration 200–800 Hz. Two simultaneous events must not share the same band.

### Concurrency and voice stealing

- Max **8** simultaneous voices total; max **4** per bus.
- When over budget, steal the **lowest priority**, then the **oldest** voice (fast 10 ms fade-out, never a click).
- Reveal stagger is 200 ms and each tick is 50 ms → **no overlap by construction**; the cap only protects against `sfx.error` + celebration collisions.
- `sfx.catalogue.tick` is the one repeat-prone event: rate-limit as stated in §2 and **never** fire it on pointer-move (hover only on intent, e.g. focus).

### Silence rules

- **No sound before a user gesture** — browser autoplay policy. The site must be silent on first paint, on load, on photo-manifest fetch, and on any programmatic state restore.
- No idle loop, no ambience bed, no "room tone" in v1. Silence between interactions is correct, not a bug.
- No sound on tab re-focus, scroll, or ambient mote drift.
- `document.visibilityState === "hidden"` → `ctx.suspend()`; visible → `ctx.resume()` only if there is a pending user-initiated event. Never resume on tab focus alone.
- Every event must complete within its stated duration; nothing may ring past 900 ms.

---

## 4. Accessibility Rules

Cross-reference: `design/accessibility-requirements.md` → **Auditory Accessibility** (all rows) and **Gameplay-Critical SFX Audit**.

1. **Sound never carries required information.** Every row in §2 has a visual and/or `aria-live` equivalent that already ships (or ships with the feature). If a future event cannot name its visual backup, it does not ship.
2. **Visual equivalents, per event family**: seal press → button pressed state; tear → dialog opens with sachet visible + `openingAnnounce`; card land → the card itself appears + numbered announcement; holo land → rarity chip + star count (never colour alone); set complete → progress line text + `lastOneAnnounce`; error → `role="status"` text. Catalogue tick, dialog open/close, flip: the state change is itself the visual.
3. **Toggle semantics** (unchanged): one button in the masthead, `aria-pressed="true|false"`, label swaps "Ton an/Ton aus" · "Sound on/Sound off", both localized with `lang` attributes; state persists at `lucky-elsa.sound.v2`. Turning sound **on** plays exactly one quiet confirmation tick (`sfx.catalogue.tick`); turning it **off** plays nothing.
4. **Reduced motion audio rule**: under `prefers-reduced-motion: reduce`, `sfx.pack.rustle` and `sfx.pack.tear` are **skipped**, and `sfx.pack.card-land` fires **once at t=0** alongside the all-at-once layout (locked choreography). No per-card ticks, no holo chime. Everything else is unchanged — motion and sound are separate concerns.
5. **No jump scares.** Peak ceiling −4 dBFS, all attacks ≥ 4 ms, no sudden high-frequency alert tones. There is no audio equivalent of a flash.
6. **Mono-compatible by construction**: v1 output is mono at every node (matches the a11y doc's "mono synthesized WebAudio" row). Any stereo/sampled upgrade requires revising the "Mono audio option" row from N/A before shipping.
7. **No audio-only destructive warning**: the reset confirm must be visually explicit; `sfx.reset.confirm` is confirmation feedback, not the warning.

---

## 5. Technical Implementation (Web Audio, synthesized only)

### Graph

```
source(s) → per-voice GainNode (envelope) → band filter → bus GainNode → master GainNode
        → DynamicsCompressor (limiter, threshold −6 dB, ratio 12) → ctx.destination
```

- Create the bus nodes **once**, lazily, with the context. Reuse them; never rebuild per event.
- One shared white-noise `AudioBuffer` (0.4 s, pre-shaped decay), built once and reused by every noise-based event.
- Every voice disconnects itself on `onended` (or a `stop()` + 20 ms tail) — no orphan nodes, no growing graph.

### Context lifecycle

- **One** `AudioContext`, created inside the first qualifying user gesture (seal press, `P`, card tap, sound-on toggle). Never at module load, never at import, never on `DOMContentLoaded`.
- `resume()` on every gesture path while `state === "suspended"`; ignore failures silently (the current `ensureAudioContext()` contract).
- Respect `state.sound === false` by **not creating** the context at all.
- Suspend on `visibilitychange → hidden`; do not auto-resume.
- Safari/iOS: always call `resume()` inside the gesture handler itself, not in an `await` continuation — an awaited branch loses the user-activation token.

### Preload / bundle policy

- **Nothing to preload.** No audio files, no fetches, no `<link rel=preload>`, no base64 blobs. Total transferred audio bytes: **0**.
- Synthesis code is a single small module (~2–3 KB of the JS budget) shipped with the app chunk; it must not create a second request.

### Performance rules (LCP / INP)

- The audio module must be **side-effect free on import**: no context, no nodes, no timers until an event fires.
- No audio work inside `requestAnimationFrame`, scroll, resize, or pointer-move handlers.
- Event dispatch must be **fire-and-forget**: schedule, return, never `await` an oscillator. A reveal tick may never delay `appendCard()` or the announcement.
- Budget: ≤ 1 ms of main-thread time per event; ≤ 8 live nodes plus fixed bus chain.
- Nothing in the audio path may gate first paint: the seal button, cards and dialogs must render identically with `AudioContext` undefined.

### Future: sampled upgrade (NOT v1)

Only after an accessibility-doc revision (mono/stereo row, "visual equivalents" re-audit) and owner approval: OGG/Opus primary + MP3 fallback (`<audio>`-free, decoded per event), 48 kHz, mono, ≤ 120 ms for UI ticks, −18 LUFS per event, ≤ 12 KB per event, ≤ 120 KB total, lazy `fetch` on first use of each event, files at `/audio/sfx/<event-key>.ogg`. Naming stays §6.

---

## 6. Naming and Keys

**Event key grammar**: `sfx.<bus>.<event>` — lowercase, dot-separated, no plural, no version suffix.

- Bus segment is one of `ui` · `pack` · `celebration`.
- Third segment names the *thing*, not the widget: `sfx.pack.tear`, not `sfx.pack.sachetTearAnimation`.
- Keys are stable identifiers used in code, in this table and in any future analytics-free debug log. Renaming a key is a spec change.
- No variation suffixes in v1: variation is **synthesis-side** (pitch ±3 %, gain ±1 dB, start offset 0–8 ms per play), not file-side.

**Legacy mapping** (for the refactor, no behaviour change intended):

| Current | New key |
| --- | --- |
| `playRip()` | `sfx.pack.tear` |
| `playTick()` | `sfx.pack.card-land` (and `sfx.catalogue.tick` where used as UI feedback) |
| `playWin()` | `sfx.pack.holo-land` |
| sound-on toggle tick | `sfx.catalogue.tick` |

**Functions**: one exported `playEvent(key, opts?)`; per-event recipes live in a single table so §2 and the code stay in sync. No per-event public function per sound.

---

## 7. Open Questions

| # | Question | Owner | Blocks |
| --- | --- | --- | --- |
| 1 | **Capstone voice line**: does the owner want one short recorded line (Elsa's human, dry catalogue humour, DE + EN) for the full-catalogue moment, or is `sfx.capstone` alone enough? A voice line breaks the "no spoken content" a11y row and needs a transcript, so it is a real decision, not a nice-to-have. | owner | capstone build |
| 2 | **Holo chime vs. land tick**: play both (current code does) or let the chime replace the tick on slot 4/5? Both is slightly busier; replace is cleaner but changes rhythm at the exact moment attention peaks. | owner + audio-director | reveal polish |
| 3 | **`sfx.error` scope**: with no accounts and no forms, the only real error surfaces are share-copy failure and empty manifest. Ship one generic error sound, or none until a second case exists? | owner | v1 scope |
| 4 | **Master default**: keep sound **on** by default (current behaviour) or default **off** until the visitor opts in? On is friendlier; off is the more conservative reading of "decorative only". | owner | launch |
| 5 | **Session cap on `sfx.milestone`**: should the "first holo of a session" milestone fire once per session or once per lap? Once per session risks feeling absent on return visits. | owner | v1 |
| 6 | **Per-bus volume**: Standard tier explicitly excludes per-channel controls; confirm we stay binary-toggle-only even after sampled audio exists. | owner + accessibility-specialist | post-v1 |
