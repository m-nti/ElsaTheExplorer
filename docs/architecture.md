# Elsa the Explorer — Master Architecture

## Document Status

- Version: 1.1
- Last Updated: 2026-11-22 (v1.1 revises the image/manifest contract to the ratified derivative design; see `photos.php` runtime endpoints)
- Engine: Web — Svelte 5.59.1 + Vite 8.3.8 + TypeScript 7.0.2 (strict, native compiler) + Vitest 5.1.1 + Playwright 1.65.1 + @sveltejs/vite-plugin-svelte 7.3.1 + sharp 0.35.5 (dev-only) + Panda CSS 2.0 (styling: typed tokens + typed rarity recipes, static artifact output, zero runtime)
- Host: IONOS shared webspace, static deploy, PHP optional (`photos.php`), never required
- Requirements Source: `PRD.md` §3–§7 (binding); `design/accessibility-requirements.md` (committed, Standard tier). GDDs/UX/art specs are being authored concurrently and are not yet reviewed here — traceability review (`/architecture-review`) runs once they land.
- ADRs Referenced: `docs/adr/ADR-0001-stack.md` (Accepted), `docs/adr/ADR-0002-styling-system.md` (Accepted). Pending: ADR-0008 (image derivative & manifest contract) — must be written before the derivative layer ships.
- Path note: the studio skill template names `docs/architecture/architecture.md`; AGENTS.md binds `docs/architecture.md` for this project. AGENTS.md wins.

---

## Engine Knowledge Gap Summary

| Domain | Risk | Assessment (as of 2026-11-22) |
| --- | --- | --- |
| TypeScript 7 (native/Go compiler) × Svelte tooling | **HIGH → mitigated** | Verified by direct inspection of the `svelte-check@4.7.8` package on 2026-11-22: it ships `--tsgo` and `--tsgo-experimental-api` flags, so `.svelte` files can be type-checked with the TS 7 native compiler. svelte-check documents that TS 7 support requires TS 6 to also be installed (npm alias, e.g. `typescript6@npm:typescript@^6`) for its language-service path. Editor language-server behaviour with TS 7 may still lag behind the CLI. Fallback is documented in ADR-0001 Consequences. |
| Svelte 5 runes in `.svelte.ts` modules | MEDIUM | Established, documented pattern (`$state`, `$derived`, `$effect` in class-based shared stores). All pinned versions verified compatible together on 2026-11-22. No SvelteKit: runes work in plain Vite without kit-specific setup. |
| Vite 8 (new major) + vite-plugin-svelte 7 | LOW | Both verified by npm resolution on 2026-11-22. Plain-Vite app (no SSR, no kit) avoids the known SvelteKit↔TS7 peer-range issue (`sveltejs/kit#17537`), which does not apply here. |
| IONOS shared hosting + PHP | LOW→MEDIUM | PHP 8.6 proven for the manifest; it now also renders fixed renditions, so encoder availability becomes load-bearing. |
| IONOS GD / WebP / AVIF + PHP memory limit | **HOST-VERIFIED-PENDING** | Webspace limits are not knowable from the repo: which GD builds exist (`imagewebp`, `imageavif`), `memory_limit`, max execution time, whether a directory above the webroot is writable for the derivative cache, and whether `.htaccess` can deny `/photos/<file>`. Verified on deploy (PRD R9); every capability has a documented fallback — no WebP/AVIF → JPEG only, no writable outer dir → `photos/.cache/` + deny, low memory → lower pixel ceiling (`413` above it). |
| Panda CSS 2.0 × Vite 8 / TS 7 (styling engine) | MEDIUM | Panel-verified 2026-11-22: Panda 2.0 (released 2026-09-29) runs a Rust engine (NAPI `@pandacss/compiler`), reads `.svelte` files natively, is ESM-only; TS 7.1 beta restored the compiler API with Svelte/Vue content mappers, so `svelte-check --tsgo` has a supported forward path. Accepted with the spike ladder in ADR-0002; fallback = dependency-free typed-token codegen via a mechanical transform of Panda's already-plain CSS custom properties output. |
| WebAudio, HEIC-in-browser | LOW | Carried over from v1 patterns; heic2any stays self-hosted and lazily loaded (PRD F22b, R7). |

---

## System Layer Map

```
┌────────────────────────────────────────────────────────────────────────────┐
│ BROWSER (single page, no router, no SSR)                                   │
│                                                                            │
│  UI Layer (Svelte 5 components — render only, no IO)                       │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ App                                                                  │  │
│  │   ├─ Stage ────────────── page shell, spotlight, lang toggle, progress │
│  │   │    ├─ PackTheatre ─── tear-open + staggered 5-card reveal         │  │
│  │   │    │    └─ CardTile (pack mode)                                   │  │
│  │   │    ├─ BinderShelf ─── full grid, lazy images                      │  │
│  │   │    │    └─ CardTile (binder mode)                                 │  │
│  │   │    └─ Diplom ───────── cycle-complete milestone view              │  │
│  │   └─ CardDetail ────────── big-card <dialog>: print, save, share      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│        ▲ reads state via runes ($state/$derived in stores)                  │
│        │ events up via typed callbacks (onclose, onselect, …)              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ State Layer (.svelte.ts stores — single source of truth)             │  │
│  │   collection │ packs │ i18n │ audio │ announcer/motion (a11y)         │  │
│  │   persistence — the ONLY module touching window.localStorage          │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│        ▲                                                                   │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ Domain Layer (pure TS, unit-tested, no DOM, no network)              │  │
│  │   types.ts │ normalize.ts │ rarity.ts │ pack.ts │ cardView.ts         │  │
│  │   i18n dictionary (de.ts / en.ts, typed)                              │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│        ▲                                                                   │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ IO Layer (side-effect adapters, each owns exactly one external API)  │  │
│  │   manifest.ts (fetch) │ persistence.ts (localStorage)                │  │
│  │   audio.ts (WebAudio) │ share.ts (navigator.share/clipboard)          │  │
│  │   heic.ts (lazy heic2any import)                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└──────────────┬─────────────────────────────────────────────┬───────────────┘
               │ HTTPS fetch                                 │ (dev only)
               ▼                                             ▼
┌──────────────────────────────┐              ┌──────────────────────────────┐
│ IONOS static webspace        │              │ Node toolchain (never shipped)│
│  photos.php?list=1  ────────►│ runtime      │  sharp thumbnails → photos/   │
│  photos.php?thumb=NAME       │ manifest +   │  thumbs/ + crop anchors       │
│  photos.php?view=NAME        │ images       │  scripts/*.mjs (owner’s QA)   │
│  photos.json        ◄─────────│ (fallback)   └──────────────────────────────┘
│  photos/captions.json        │
└──────────────────────────────┘
```

Layer rule: dependencies point downward only. A component may import a store; a store
may import the domain layer; the domain layer imports nothing. No component ever
calls `fetch`, `localStorage` or `AudioContext` directly.

---

## Module Ownership

| Module | Owner (role) | Responsibility | Must not |
| --- | --- | --- | --- |
| `App.svelte` | ui-programmer | Boot orchestration, error/empty overlays, deep-link handling | Rendering card internals |
| `Stage`, `PackTheatre`, `BinderShelf`, `Diplom` | ui-programmer | Page composition, reveal choreography | Knowing storage/network |
| `CardTile`, `CardDetail` | ui-programmer + technical-artist | Card print layout, content budgets, foil layers | Mutating state |
| `collection`, `packs` stores | gameplay-programmer | Collection state, pack draw orchestration | IO |
| `rarity.ts`, `pack.ts`, `cardView.ts` | systems-designer + lead-programmer | Pure rules: rarity derivation, draw, promotion | State |
| `manifest.ts` | lead-programmer | Fetch + normalize + fallback chain | State mutation |
| `persistence.svelte.ts` | lead-programmer | localStorage schema, versioning, migration | Business rules |
| `i18n.svelte.ts` + dictionary | localization-lead | Typed DE/EN dictionary, `lang` attribute, announcements | Content authoring (writer owns copy) |
| `audio.svelte.ts` | sound-designer + ui-programmer | SFX synthesis, mute persistence | Visual state |
| `a11y/*` | cs-accessibility-engineer | Focus trap/return, announcer regions, motion preference | — |
| `design/tokens/` + `panda.config.ts` | art-director + technical-artist | Typed token source and Panda 2.0 config: tokens + typed rarity recipes → static artifacts (ADR-0002) | Redefining tokens in component CSS; raw color values outside `design/tokens/` (stylelint-enforced) |

---

## Component Breakdown (Svelte 5)

All components use runes syntax (`$props`, `$derived`, `$state`), typed callback
props (Svelte 5 style — no `createEventDispatcher`), and the ratified styling
system (ADR-0002): typed Panda tokens + typed recipes are the variant surface;
bespoke art CSS (foil, spotlight) lives in Svelte component-scoped CSS and
consumes tokens only via `var(--elsa-*)` / `var(--tier-*)` — it may never
redefine them. Stylelint enforces `var()`-only consumption in CI.

### `App.svelte` — root, no props

```svelte
<script lang="ts">
  import { collection } from '$lib/stores/collection.svelte';
  // boot: load manifest → hydrate stores → route ?photo= deep link
</script>
<!-- Stage | ManifestErrorState | ManifestEmptyState (from collection.status) -->
```

Owns: boot sequence, `<svelte:head>` (`<title>`, `og:` tags, `lang` attribute via `i18n`),
the no-JS `<noscript>` contract stays in `index.html`.

### `Stage.svelte` — page shell

```ts
interface Props { } // reads stores directly; pure composition
```

Renders header (title, `LangToggle`, `SoundToggle`), progress line
(`progress.seen` / `progress.total` + bar), `PackTheatre`, `BinderShelf`, `Diplom`.
The "only lit object in the room" spotlight is Stage-scoped CSS; the card itself
is lit by `CardTile`.

### `PackTheatre.svelte` — pack opening theatre

```ts
interface Props {
  pack: readonly PackSlot[];      // from packs.current — never a mutated PhotoRecord
  revealed: number;               // how many cards have been revealed so far
  opening: boolean;               // seal/tear phase
  onRevealComplete: () => void;   // packs.revealNext() loop finished
  onSelect: (index: number) => void;
}
```

- Reduced motion (`motion` store): renders all five at once, no tear animation, no confetti (PRD F22).
- Reveal is time-choreographed internally; each revealed card announces via `announcer`.
- Every visible string comes from the i18n dictionary — no copy may promise an
  interaction PackTheatre does not implement (the "swipe" defect; enforced by a test, see Testing).

### `CardTile.svelte` — one printed card, both contexts

```ts
interface Props {
  card: CardView;                 // derived view model, see cardView.ts
  size: 'pack' | 'binder';
  index: number;                  // for aria ("Karte 3 von 5")
  onselect: (photoId: string) => void;
}
```

**Content budgets (structural overflow fix).** The card has four fixed zones —
name plate, art window, category strip (rarity stars), ability panel — each a
fixed-percentage grid row. Each zone carries a hard character budget constant in
`cardView.ts` (`NAME_MAX = 40`, `MOOD_MAX = 48`, `CAPTION_MAX = 180`, `ALT_MAX = 200`).
`CardView` production truncates with ellipsis; a Vitest test pins the budgets;
`CardTile` CSS uses `overflow: hidden` + `text-overflow` as the last line of
defense, never as the layout plan. No zone may size to its content.

The art window uses `object-position` from `photo.focus` (default center) so crop
anchors survive every frame size. Foil layers (rays, glitter, glare, print frame)
are bespoke art in `CardTile`'s Svelte-scoped CSS, consuming tokens only via
`var()`; rarity tiers come from a **typed Panda recipe** (`cardRecipe({ rarity })`)
— per ADR-0002, recipes are the only sanctioned variant mechanism. Rarity changes
foil strength, never the photo (PRD §5 Design).

### `BinderShelf.svelte` — the full grid

```ts
interface Props {
  cards: readonly CardView[];     // derived from collection.photos, binder order
  onselect: (photoId: string) => void;
}
```

Lazy thumbs (`loading="lazy"`, `decoding="async"`, `width`/`height` from the
manifest → no layout shift). Each tile is a `<button>` with accessible name
`<name> — <rarity label>` + seen state in text, never color alone (F11, a11y tier).
Binder rarity is **always intrinsic** — the shelf has no notion of pack promotion.

### `CardDetail.svelte` — big-card dialog

```ts
interface Props {
  card: CardView | null;          // null ⇒ dialog closed
  opener: HTMLElement | null;     // focus return target (F20)
  onclose: () => void;
  onstep: (delta: 1 | -1) => void; // ← / → walks the current context
}
```

Native `<dialog>` + `showModal()` (focus trapping for free), `onclose` fires from
Esc and backdrop. Context-dependent rarity: cards opened from a pack slot show
the slot's presented rarity; from the binder or deep link, intrinsic rarity.
Actions: save (original via `view`), share (`share.ts`: `navigator.share` →
clipboard fallback → visible confirmation state), "another pack".
**Keyboard: `P` opens a pack, `←`/`→` step cards, focus returns to the pack button
on close (F20). No swipe gestures — if copy once promised swiping, that copy is
wrong, not the feature (see defect matrix).**

### `Diplom.svelte` — cycle-complete milestone

```ts
interface Props {
  open: boolean;                  // shown when seen === total && total > 0, once per cycle
  total: number;
  onclose: () => void;
}
```

Awarded when the binder round completes (F6 "shown in the progress line and
announced"): the museum register celebrates a complete viewing cycle with a
diploma. Same `<dialog>` + focus-return contract as CardDetail.

---

## Stores (runes-based, `.svelte.ts`)

Class instances exported as singletons; state via `$state`, derived values via
`get` accessors over `$derived`, side-effectful reactions via `$effect` in
`App.svelte` only (stores stay framework-lean and testable).

### `collection.svelte.ts`

```ts
export class CollectionStore {
  photos = $state<readonly PhotoRecord[]>([]);
  status = $state<ManifestStatus>({ phase: 'loading', source: null, dropped: 0 });
  seenIds = $state<ReadonlySet<string>>(new Set());

  get progress(): { seen: number; total: number; cycleComplete: boolean } { … }
  isSeen(id: string): boolean { … }
  markSeen(ids: readonly string[]): void { … }   // called once per opened pack
  reset(): void { … }                            // "Von vorn" (F26)
  async load(): Promise<void>;                   // delegates to manifest.ts, sets status
}
export const collection = new CollectionStore();
```

`seen` is the only persisted collection state (PRD: no accounts, the library
state is "what you have seen"). Sets are rebuilt from persisted arrays on boot.

### `packs.svelte.ts`

```ts
export class PacksStore {
  current = $state<readonly PackSlot[] | null>(null);
  opening = $state(false);
  revealed = $state(0);

  open(): readonly PackSlot[];   // pure draw via pack.ts drawPack(collection.photos, collection.seenIds)
  revealNext(): void;            // steps the reveal; drives CardTile unlock + tick sfx
  clear(): void;                 // on "another pack"
}
export const packs = new PacksStore();
```

### Rarity — single source of truth (the "derive, never copy" rule)

```ts
// src/lib/data/pack.ts
export interface PackSlot {
  readonly photoId: string;   // reference into collection.photos — never a copy
  readonly promoted: boolean; // pack-scoped "one card shines" flag (PRD F4)
}

// src/lib/data/rarity.ts
export function intrinsicRarity(photo: PhotoRecord): Rarity {
  if (photo.rarityOverride) return photo.rarityOverride;      // captions.json/manifest (F23)
  const roll = fnv1a(`${photo.id}#rarity`) % 100;            // stable hash of the photo id (F3)
  if (roll >= HOLO_THRESHOLD) return 'holo';                 // 88, as in v1
  if (roll >= RARE_THRESHOLD) return 'rare';                 // 64
  return 'common';
}

export function presentedRarity(photo: PhotoRecord, slot: PackSlot | null): Rarity {
  return slot?.promoted ? 'holo' : intrinsicRarity(photo);
}
```

Rules, enforced by types and tests:

1. `PhotoRecord` is **frozen** (`Object.freeze`) at normalization; `rarity` is a
   derived field computed once at normalization. There is no mutable rarity
   anywhere in the app.
2. The pack stores **slots** (`photoId` + `promoted`), never `PhotoRecord`
   copies. v1's bug was `chosen[promote] = { ...chosen[promote], rarity: "holo" }`
   (app.js:905): the promoted copy lived in `state.pack` while the binder derived
   from `state.photos`, so one photo carried two rarities. Here promotion is a
   boolean on the slot; both `PackTheatre`/`CardDetail` (via slot) and
   `BinderShelf` (without slot) call the same `rarity.ts` functions. A pack
   promotion cannot survive the pack: the binder always shows the intrinsic value.
3. A `CardView` is a **derived read model** built per render context:
   `cardView.ts` has `packCardView(slot, index)` and `binderCardView(photo)`.
   Components never compute rarity themselves.

### `persistence.svelte.ts`

```ts
export class PersistenceStore {
  read<T>(key: StorageKey, parse: (raw: unknown) => T | null): T | null;
  write(key: StorageKey, value: unknown): void;   // JSON envelope { v: 1, data }
  migrate(): void;                                // v1 keys → v2 schema, once at boot
  wipe(): void;                                   // reset: confirms, then clears ALL lucky-elsa.*
}
```

Only this module imports `window.localStorage`. Stores subscribe through it via
explicit `$effect` calls owned by `App.svelte` (write-through on change); reads
happen once at boot. A failed read (Safari private mode, quota) yields defaults
and degrades silently — the app must run with storage unavailable.

### `i18n.svelte.ts`

```ts
export class I18nStore {
  lang = $state<Lang>('de');
  setLang(lang: Lang): void;                       // persists, sets <html lang>, announces
  t<K extends keyof Dictionary>(key: K, vars?: Vars): string;
}
```

Typed dictionary: `src/i18n/de.ts` is the master (`Dictionary` type inferred),
`en.ts` is `satisfies Dictionary` — a missing key is a **compile error**, which
mechanically enforces F8/M4 (0 untranslated strings). Resolver order (F9):
`?lang=` URL param → stored preference → `de` default. Content strings from the
manifest are `Localized` records, not dictionary keys.

### `audio.svelte.ts`

```ts
export class AudioStore {
  enabled = $state(true);                          // persisted (F19)
  play(name: 'rip' | 'tick' | 'win' | 'bigWin'): void;
}
```

WebAudio context created lazily on first user gesture; synthesis only (v1's
procedural approach, no audio assets). Context creation failure → silent, no error UI.

### `a11y/announcer.svelte.ts` and `a11y/motion.svelte.ts`

```ts
export class AnnouncerStore { say(message: string, mode: 'polite' | 'assertive'): void; }
export class MotionStore { reduce = $state(false); /* live-updated from matchMedia */ }
```

Single polite region + single assertive region owned by `App.svelte`; all
announcement strings flow through `i18n.t` so they switch with the language (F8/F21).

---

## Data Contracts

### `photos.php` runtime endpoints (unchanged, binding)

| Endpoint | Returns |
| --- | --- |
| `photos.php?list=1` | JSON manifest (below), `Cache-Control: no-store` |
| `photos.php?thumb=NAME` | cached JPEG ≤ 720 px (GD, `.cache/`), falls back to the file itself |
| `photos.php?view=NAME` | original image; HEIC → converted JPEG when Imagick can, else original |

Path hardening stays as-is: `basename`, extension allowlist, `realpath` inside
`photos/` only, `nosniff`, `Referrer-Policy: same-origin` (PRD §5 Security).

### Manifest shape — current (documented from `photos.php` + `photos.json`)

```jsonc
{
  "generated": "2026-11-01T09:34:10.827Z",   // ISO date
  "source": "photos",                        // 'photos' | 'demo' (make-demo.mjs)
  "photos": [
    {
      "id": "elsa-01",                       // slugified, server-side deduped with -2, -3 …
      "src": "photos/elsa-01.jpg",           // HEIC files: "photos.php?view=NAME"
      "thumb": "photos/thumbs/elsa-01.jpg",  // php: "photos.php?thumb=NAME"
      "view": "photos/elsa-01.jpg",
      "filename": "elsa-01.jpg",
      "caption": "",                         // string OR { "de": "…", "en": "…" }
      "alt":    { "de": "…", "en": "…" },    // string OR Localized
      "name":   { "de": "…", "en": "…" },
      "mood":   { "de": "…", "en": "…" },
      "description": { "de": "…", "en": "…" },
      "rarity": "",                          // '' | 'common' | 'rare' | 'holo' (F23 override)
      "demo": false,                         // true ⇒ sample card (never empty site, PRD §7)
      "heic": false,
      "width": 5712,
      "height": 3840
    }
  ]
}
```

`captions.json` (owner-authored, per-photo) is merged server-side by `photos.php`;
the client never reads it directly.

### Manifest v2 extension — optional, backward compatible

Three new **optional** fields per photo; every consumer must treat them as absent:

```jsonc
"set": "sommer-2026",              // optional grouping tag, default null; used for binder headings
"focus": { "x": 0.35, "y": 0.30 }, // crop anchor, normalized 0..1, default {x:0.5,y:0.5}
"chase": true                      // optional chase-card marker, default false
```

- `chase` is a **content marker only** — it does not feed the rarity hash and
  never overrides F3 ("no automatic rarity by hand"). Whether/how it is printed
  on the card is a design decision, not an architecture one.
- `focus` replaces v1's ad-hoc cropping with data: `object-position: focus.x*100% focus.y*100%`.
- Normalization (`normalize.ts`), the one funnel for `photos.php`, `photos.json`
  and demo data, applies defaults and types every field; malformed entries are
  **dropped and counted** (`status.dropped`), never half-kept.

### Resolution chain (F14) with distinct failure states

```
photos.php?list=1 (3 s timeout) ──ok──► normalize ──► ready(source: 'php')
        │ non-OK/timeout/invalid JSON                    (degraded flag if php failed first)
        ▼
photos.json?ts=<now> (4 s timeout) ──ok──► normalize ──► ready(source: 'static')
        │
        ▼
network-error  ≠  empty          // THE v1 bug: these two collapsed into one state
```

`network-error` (fetch failed, timeout, non-JSON) and `empty` (valid manifest,
zero photos) are separate `ManifestStatus` phases with separate copy: the empty
state instructs the owner ("drop photos into `photos/`, reload"); the error state
offers retry — in both languages (F15).

---

## Event Flow

**Boot**

1. `App.svelte` mounts → `persistence.migrate()` → hydrate `lang`, `sound`, `seen`.
2. `i18n` applies `?lang=` → stored → `de`; sets `<html lang>`; `svelte:head` title/og follow.
3. `collection.load()` → status transitions `loading → ready | network-error | empty | invalid`.
4. On ready: `pruneSeen()` (drop ids no longer in the manifest — photos removed by
   the owner must not count as seen), binder renders, `?photo=<id>` deep link opens
   `CardDetail` (F12) if present.

**Pack open**

1. User activates pack button (click or `P`) → `packs.open()` → pure `drawPack()`
   → slots; `opening = true`; `audio.play('rip')`; `announcer.say(t('openingAnnounce'))`.
2. `PackTheatre` choreographs reveal: per card `packs.revealNext()` → tick sfx,
   non-common → win sfx, announcer says name + rarity (F21).
3. On completion: `collection.markSeen(slotIds)` (single write-through to
   persistence), progress updates, `Diplom` opens if the cycle completed (F6),
   confetti gated on `motion.reduce`.

**Card detail** — open from pack slot / binder tile / deep link → `showModal()`,
focus trapped, `←/→` step within the opening context, close returns focus to
opener (F20).

**Language toggle** — `i18n.setLang` → every string re-renders (dictionary is a
store dependency), `<html lang>` + `<title>` + `og:locale` update, announcement
in the new language (F8), persisted.

**Reset** — confirm dialog → `persistence.wipe()` clears **all** `lucky-elsa.*`
keys (AGENTS.md binding) → stores reset → fresh cycle announced.

---

## Accessibility Architecture (Tier: Standard, committed)

| Concern | Mechanism |
| --- | --- |
| Announcements | `announcer` store → one polite + one assertive live region in `App`. Pack flow (open, five names, restart, language switch, flip) fully announced (F21). All strings via `i18n` so language switches propagate. |
| Focus | `a11y/focus.ts`: `showModal` for dialogs (native trap); explicit opener tracking (`opener` prop) for return focus (F20); visible focus everywhere via `:focus-visible` token ring. |
| Keyboard | `P` = open pack; `←/→` = step cards; `Esc` = close; full tab order through pack → binder tiles → toggles. No pointer-only interactions. |
| Reduced motion | `motion` store from `matchMedia('(prefers-reduced-motion: reduce)')`, live-updated. Every animation, the foil shimmer and confetti gate on it; reduced mode renders all five cards at once (F22). |
| Contrast | All color flows from the typed token source `design/tokens/` (ADR-0002). The v1 `--quiet` token (below 4.5:1) is fixed at token level — one corrected value, every consumer inherits. A **Vitest contrast gate computes WCAG ratios from `tokens.ts`**; a sub-4.5:1 token fails the build. Stylelint's `var()`-only rule bars ad-hoc colors in component CSS; axe-core in Playwright verifies the rendered result on the built bundle. |
| No color-only info | Rarity = label + star count + foil strength (never hue alone); seen state = text + checkmark + dimming. |
| Language | `<html lang>` always current; per-element `lang` where DE/EN mix on one card (PRD §5 "declared per element where it matters"). |
| No-JS | `<noscript>` notice in `index.html` in both languages explaining why the pack cannot open (PRD edge case). |

---

## Performance Budget (PRD §5: feels instant on mobile data)

| Budget | Value | Enforced by |
| --- | --- | --- |
| Initial JS (gzip, main bundle) | ≤ 60 KB target, 100 KB hard cap | `vite build` size check in CI (fail over cap) |
| Initial CSS (gzip) | ≤ 30 KB — counts Svelte-scoped CSS **plus** generated Panda artifacts (`styled-system/`) | same, plus the ADR-0002 CSS byte-budget gate |
| LCP | < 2.5 s mid-tier mobile; < 1.8 s desktop | Playwright trace on the qa profile, advisory |
| CLS | 0 | `width`/`height` on every image; fixed card frame grid |
| Images on cards/binder | ≤ 720 px display copies only | thumbs pipeline (PHP runtime / sharp dev) |
| Originals | detail dialog + "Foto speichern" only | CardDetail uses `view`, never `thumb` |
| Binder images | lazy-loaded, native `loading="lazy"` | BinderShelf |
| Third-party | none, ever: no CDN fonts (Chivo self-hosted), no analytics, no external requests (PRD §5/§7) | Playwright request-block audit |
| HEIC decoder | dynamic `import()` only when a HEIC src is actually needed | heic.ts |
| Bundle hygiene | no runtime i18n/image/utility dependencies — dictionary and helpers are first-party code | dependency audit in review |

JS budget rationale: the entire v1 app was 1780 lines of unminified vanilla JS
(~55 KB); the Svelte 5 rewrite must not exceed it materially. If it does, the
first suspects are the dictionary (ship per-language, lazy-load EN) and the
theatre animation code.

---

## Error-State Taxonomy (per data consumer)

| Consumer | State | Trigger | Copy/behaviour (DE + EN) |
| --- | --- | --- | --- |
| Manifest (`collection.status`) | `loading` | boot | skeleton/spotlight only, no fake content |
| | `ready` | normalized > 0 photos (with `source: 'php' \| 'static'` and `degraded` flag) | normal app |
| | `empty` | valid manifest, 0 photos **and** no demo set | owner-directed instructions (F15) |
| | `network-error` | both fetches failed/timed out/non-JSON | "can't reach the archive" + retry button |
| | `invalid` | manifest parsed but > 0 entries dropped | ready + inline count: "N cards were skipped (malformed)" |
| Single image (CardTile/Detail) | `loaded` | — | — |
| | `thumb-failed` | thumb 404/error | fall back to `src` |
| | `image-failed` | src also fails (R7 HEIC worst case) | card frame stays readable, printed text carries the card (PRD R7) |
| localStorage | `ok` / `unavailable` | write/read throws | continue with in-memory defaults; never block the visit; reset button disabled with explanation |
| Share | `native` / `clipboard` / `denied` | API presence / promise result | visible confirmation per state; never silent failure (F25) |
| Audio | `enabled` / `silent` | context creation fails or muted | no error UI, sound toggle reflects intent |
| HEIC in-browser | `converted` / `native` / `failed` | heic2any load/draw | failed → image-failed state above (R7) |

Rule: **every async consumer declares its terminal states in a discriminated
union**, and every terminal state has bilingual copy. A component cannot render
"nothing" for a state it forgot.

---

## Persistence Schema (localStorage, all keys `lucky-elsa.*`)

Per-concern keys, each value a self-versioned envelope:

```jsonc
// lucky-elsa.lang.v2     { "v": 2, "data": "de" | "en" }
// lucky-elsa.sound.v2    { "v": 2, "data": true | false }
// lucky-elsa.seen.v2     { "v": 2, "data": ["elsa-01", …] }   // order-insensitive
```

- **Migration (boot, `persistence.migrate()`)**: v1 keys (`lucky-elsa.seen.v1`
  bare array, `lucky-elsa.sound.v1` bare bool, `lucky-elsa.lang.v1` bare string)
  are read leniently → mapped into v2 envelopes → v2 written → v1 keys deleted
  **only after** the v2 write succeeded. A v1 read failure costs nothing: defaults.
- `seen` is pruned against the manifest at boot (owner removes a photo → it
  leaves the collection; ids never resurrect).
- Future schema changes bump `v` and extend `migrate()`; unknown-but-higher `v`
  → keep data, treat as defaults, never overwrite (forward safety).
- **Reset** clears every `lucky-elsa.*` key after confirmation (AGENTS.md, F26).
- No other origin data, ever (PRD §5 Privacy: first-party only).

---

## Folder Structure

```
EhrenElsa/
├─ index.html                  # shell: <html lang="de">, meta/og, noscript, font preload
├─ photos.php  photos.json  photos/captions.json   # runtime data (owner’s FTP flow)
├─ assets/                     # v1 static files → deleted at refactor end
├─ src/
│  ├─ main.ts                  # mount, font/loading, error boundary
│  ├─ App.svelte
│  ├─ lib/
│  │  ├─ components/           # Stage, PackTheatre, CardTile, BinderShelf,
│  │  │                        # CardDetail, Diplom, LangToggle, SoundToggle,
│  │  │                        # ProgressBar, StateMessage
│  │  ├─ stores/               # *.svelte.ts — collection, packs, persistence,
│  │  │                        # i18n, audio, (a11y: announcer, motion)
│  │  ├─ data/                 # types.ts, normalize.ts, manifest.ts, rarity.ts,
│  │  │                        # pack.ts, cardView.ts, budgets.ts
│  │  ├─ io/                   # share.ts, heic.ts
│  │  └─ a11y/                 # focus.ts, announcer.svelte.ts, motion.svelte.ts
│  ├─ i18n/                    # schema.ts, de.ts (master), en.ts (satisfies Dictionary)
│  └─ styles/                  # base.css (page shell, font loading) — tokens/recipes
│                              # live in design/tokens + panda.config.ts, consumed via var()
├─ design/
│  ├─ tokens/                  # typed token source (tokens.ts …) — the single source of
│  │                           # truth; WCAG ratios computed here, gated by Vitest (ADR-0002)
│  └─ …                        # GDDs, UX, art bible, accessibility-requirements.md
├─ panda.config.ts             # Panda CSS 2.0: tokens + typed rarity recipes → static artifacts
├─ styled-system/              # GENERATED by Panda (static CSS artifacts) — gitignored
├─ scripts/                    # photos.mjs (sharp thumbs + anchors), make-demo.mjs,
│                              # make-og.mjs; qa.mjs → superseded by Playwright
├─ tests/
│  ├─ unit/                    # Vitest: pack rules, rarity, normalize, migration, i18n parity
│  └─ e2e/                     # Playwright: flows, keyboard, reduced motion, error states
├─ docs/                       # architecture.md, adr/
└─ design/                     # GDDs, UX, art bible, accessibility-requirements.md,
                               # tokens/ (typed token source, see above)
```

Import alias `$lib` → `src/lib` via `vite.config.ts` (mirrors Svelte convention,
no kit needed).

---

## Testing Strategy

**Vitest 5 — domain layer (pure, fast, no DOM).** The pack rules live in `pack.ts`
/ `rarity.ts` precisely so this suite never touches a browser:

- `drawPack`: always 5 (or all photos if fewer, F1); no repeat within a pack (F5);
  unseen-first, whole-cycle fairness incl. restart announcement flag (F6);
  ≥ 1 rare-or-holo per pack — via intrinsic rarity or exactly one promotion (F4).
- `intrinsicRarity`: deterministic per id across reloads/other packs (F3, M3) —
  same id ⇒ same rarity, 10 000 draws, zero divergence; override from manifest wins.
- **Rarity single-source invariant**: given any draw, `binderCardView(photo).rarity ===
  intrinsicRarity(photo)` for every photo — the regression test for the v1 copy bug.
- `normalize`: every manifest shape (php, static, v2 extras present/absent,
  malformed entries dropped + counted, string vs Localized fields).
- `persistence.migrate`: v1 → v2 mapping, no data loss, forward-version safety,
  wipe-clears-all-keys (enumerates `lucky-elsa.*`).
- i18n: `en satisfies Dictionary` (compile-time) + runtime key parity test; every
  announcement/state copy key exists in both languages; **interaction-copy audit**:
  no string may reference an interaction absent from the interaction matrix
  (kills the "promises swiping" class of defect at the source).
- Content budgets: name/mood/caption truncation at declared maxima.
- **Contrast gate** (ADR-0002): WCAG ratios computed directly from `design/tokens/`'s
  `tokens.ts` — every text token ≥ 4.5:1. The gate ships with a negative test:
  it must demonstrably REJECT the known sub-4.5:1 v1 `--quiet` value before it is
  trusted to pass anything.

**Playwright 1.65 — flows on the built app (`vite preview` + mocked routes).**

- Open pack: 5 cards reveal, dialog opens, focus returns to the pack button (F20).
- Keyboard-only run: `P`, `←/→`, `Esc`, tab through the binder — no pointer events.
- `prefers-reduced-motion: reduce` emulation: no reveal animation, all five at
  once, no confetti (F22); VoiceOver-equivalent assertions via live-region text.
- Language: default German (F7), toggle switches `<title>`, aria-labels, rarity
  labels (F8), persists across reload, `?lang=en` beats storage (F9).
- Deep link `?photo=<id>` opens the right card in both languages (F12).
- Error states via route mocking: `photos.php` 500 → `photos.json` fallback works
  (degraded); both fail → `network-error` + retry; valid-but-empty → `empty`
  owner instructions. The v1 "fetch-failure ≡ empty" collapse is asserted impossible.
- Layout: no horizontal overflow at 320/390/414/640/1280/1920 (F17); card zones
  never overflow at the longest permitted strings (budget strings injected).
- a11y: axe-core pass (WCAG 2.2 AA) on the built bundle, verifying the contrast
  gate's token math holds in rendered output.
- Privacy: zero third-party requests on a clean run (request-block audit).

**Styling enforcement belt (mandatory CI, per ADR-0002).**

- Stylelint on component-scoped CSS: raw values forbidden — consumption only via
  `var(--elsa-*)` / `var(--tier-*)` — and **duplicate selectors as errors**.
- Cross-file selector-diff check: Stylelint is per-file, so a scripted repo-level
  diff catches duplication across component CSS files.
- Svelte 5 unused-CSS warnings escalated to CI errors.
- knip: dead token/recipe/exports fail the build.
- CSS byte budget in the bundle check (includes generated `styled-system/` output).

CI order: `svelte-check --tsgo` + `tsc --noEmit` → Stylelint + cross-file diff +
knip → Vitest (incl. contrast gate) → build + bundle-budget check → Playwright.
`scripts/qa.mjs`'s checks are absorbed here.

---

## API Boundaries (internal)

| Boundary | Allowed to | Never |
| --- | --- | --- |
| Domain (`data/*`, `i18n/*`) | pure TS only | `fetch`, DOM, storage, audio |
| IO (`manifest.ts`, `io/*`, `persistence`) | exactly one external API each | domain rules |
| Stores | domain + their IO adapter | DOM outside `App`-owned `$effect`s |
| Components | store reads + typed callbacks | `fetch`, `localStorage`, `AudioContext`, direct rarity computation |

External contracts (frozen, change only via ADR): `photos.php` endpoints and
manifest shape above; the `lucky-elsa.*` storage namespace.

---

## Known-Defect Prevention Matrix

| v1 defect | Structural prevention |
| --- | --- |
| Card content overflows its fixed frame | Fixed-percentage zone grid in `CardTile` + hard character budgets in `budgets.ts`, truncated at `CardView` build time, pinned by unit test + overflow e2e |
| Holo promotion applied to a copy → rarity diverges between pack and binder | `PackSlot { photoId, promoted }` slots instead of copied records; frozen `PhotoRecord`; one `rarity.ts` for both contexts; dedicated invariant test |
| Fetch failure and empty archive collapsed into one state | `ManifestStatus` discriminated union with separate `network-error` / `empty` phases + route-mocked e2e |
| `--quiet` contrast below 4.5:1 | Typed token source `design/tokens/` (single corrected value); Vitest contrast gate over `tokens.ts` fails the build on any sub-4.5:1 token (with a negative test against the v1 value); stylelint `var()`-only bars off-token colors; axe-core verifies rendered output |
| Copy promised swipe navigation that doesn't exist | Interaction-copy audit test: every interaction word in copy must map to a handler; swipe removed from copy (feature not planned) |

---

## ADR Audit

| ADR | Title | Status |
| --- | --- | --- |
| ADR-0001 | Stack: Svelte 5 + Vite 8 + TypeScript 7 + Vitest/Playwright | Accepted (owner decision, 2026-11-22) |
| ADR-0002 | Styling system: Panda CSS 2.0 typed tokens/recipes + scoped-CSS foil art + enforcement belt | Accepted (owner decision, 2026-11-22, 3-specialist panel) |

No conflicts: ADR-0002 refines ADR-0001's styling consequences (hand-authored
tokens → typed token source; toolchain fallback ladder for the styling layer is
recorded in ADR-0002).

## Required ADRs (to be written before implementation of their layer)

Numbering note: ADR-0002 was assigned to the styling system at owner
ratification (2026-11-22); the list below is shifted accordingly.

| ADR | Topic | Why it needs its own record |
| --- | --- | --- |
| ADR-0003 | State & persistence schema (envelopes, migration, wipe) | Data-loss risk lives here |
| ADR-0004 | Manifest contract v2 (`set` / `focus` / `chase`) | Cross-team contract with the owner's FTP flow |
| ADR-0005 | Card frame & content budgets | The overflow fix is a component-level contract |
| ADR-0006 | A11y runtime architecture (announcer, focus, motion) | Committed Standard tier |
| ADR-0007 | Test architecture & CI gates | Budget enforcement needs a home |

## Architecture Principles

1. **Derive, never copy.** One source of truth per fact; everything else is a
   computed view. (Rarity, seen state, language, budgets all follow this.)
2. **IO at the edges.** Domain rules are pure and unit-tested; components render.
3. **The owner's file drop is the API.** Every data change must survive "FTP +
   reload, no redeploy" (PRD §7).
4. **Every state speaks.** No terminal state without bilingual copy; no silent
   failure a visitor can fall into.
5. **Budgets are tests.** Performance, contrast, and copy budgets fail the build,
   not the review.
6. **Privacy is structural.** First-party only, no analytics, no external
   requests — audited, not promised.

## Build-Phase Checklist

Validation work that does **not** block the Accepted ADRs but must complete
during the first build phase (ADR-0001 Consequences; ADR-0002 Spike Items):

1. **Stack validation** (ADR-0001): `svelte-check --tsgo` in daily use — including
   editor language-server behaviour with TS 7; apply the documented fallback
   (native `tsc --noEmit` over `src/**` + svelte-check on aliased TS 6) if it
   misbehaves. Bundle-budget measurement on the first real build.
2. **Vertical slice spike** (ADR-0002): 3 cards + one holo variant through
   Panda 2.0 + Vite 8.3.8 + `svelte-check --tsgo`; measure artifact size and
   build time before the styling layer is rolled out across components.
3. **Contrast-gate spike** (ADR-0002): the Vitest gate must demonstrably REJECT
   the known sub-4.5:1 `--quiet` value (negative test) before it is trusted to
   pass the corrected token set.
4. Remaining ADR-0002 spikes: stylelint `var()`-only + duplicate-selector config,
   holo-recipe reconciliation with old-vs-new rendered CSS diff, Svelte
   unused-CSS-warning CI escalation, cross-file selector-diff check.

## Open Questions

1. **TS 7 editor experience** — CLI path verified (`svelte-check --tsgo` in
   4.7.8); ADR-0001 is Accepted (2026-11-22), so this is a build-phase checklist
   item, not a blocker: if the language server misbehaves during implementation,
   fall back per ADR-0001 without changing the stack.
2. **Diplom trigger** — diploma on every completed cycle, or first completion
   only? (design decision; architecture supports both — `cycleComplete` flag.)
3. **`chase` semantics** — printed marker vs. hidden variant; needs
   game-designer + owner before ADR-0003 is finalized.
4. **`set` presentation** — binder headings vs. filter; UX decision pending.
5. **EN lazy-loading** — ship dictionary per language if the 60 KB budget
   tightens; harmless now, revisit at first build measurement.
