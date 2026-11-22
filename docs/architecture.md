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
               │ HTTPS fetch (derivative URLs)                         │ (dev only)
               ▼                                                    ▼
┌────────────────────────────────┐    ┌────────────────────────────────┐
│ IONOS static webspace          │    │ Node toolchain (never shipped) │
│  ?list=1             (manifest)│    │  sharp → photos/thumbs/        │
│  ?image=NAME&size=             │    │        + derivatives/ (dev/QA  │
│        tile|pack|detail        │    │        mirror of PHP cache)    │
│      &format=jpeg|webp         │    │  scripts/*.mjs (owner’s QA)    │
│  ?thumb=NAME     (720 alias)   │    └────────────────────────────────┘
│  ?download=NAME  (1600 px)     │
│  ?view=NAME   (302 download)   │
│  photos.json captions.json     │
│  cache OUTSIDE webroot         │
└────────────────────────────────┘
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
Actions: save (`images.download` → 1600 px compressed JPEG; the source is never
downloadable through the UI), share (`share.ts`: `navigator.share` →
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

### `photos.php` runtime endpoints — derivative contract (ADR-0008)

`photos.php` is the **only** renderer of photo bytes. It never serves an original. Every
request resolves to one of four fixed renditions, a legacy alias, or a non-image error;
there is no code path that streams the source file to a browser.

| Endpoint | Returns |
| --- | --- |
| `photos.php?list=1` | JSON manifest (below), `Cache-Control: no-store`. Contract unchanged. |
| `photos.php?image=NAME&size=tile\|pack\|detail&format=jpeg\|webp` | Cached fixed-size rendition (longest edge 360 / 720 / 1200), served `public, max-age=31536000, immutable` — the URL carries the source version, so a replaced photo gets a new URL. Unknown `size`/`format` → **415**; nothing else is accepted. |
| `photos.php?thumb=NAME` | Compatibility alias for `size=pack&format=jpeg` (720 px), kept so a stale client still receives a bounded image. Documented deprecated. |
| `photos.php?download=NAME` | Explicit 1600 px compressed JPEG with `Content-Disposition: attachment` — what "Foto speichern" fetches. Never the source. |
| `photos.php?view=NAME` | **Retired as an image source**: `302` → `?download=NAME`. Exists only so pre-refactor clients do not break; it never returns source bytes. |

**Measured baseline (2026-11-22), the reason this contract exists:** a 3.98 MB original
(5712×4284, 24.47 MP) produced a 540×720 PHP thumbnail of **61.9 KB** — 1.6 % of the source — while
`?view=` delivered the full **3.98 MB** on a UI request. That is a ~64× overdraw on the one
request the card grid and the dialog both make. Worse, the old `sendThumbnail()` fell
through to `serveFile($path)` on every failure branch (photos.php:346 / 352 / 361), so a
*thumbnail* request could hand a phone the original. This contract removes that failure
class structurally instead of patching branches.

#### Rendition matrix — fixed sizes only

| Rendition | Longest edge | Formats (quality) | Byte ceiling |
| --- | --- | --- | --- |
| `tile` | 360 | jpeg 78 / webp 72 | ≤ **45 KB** (art bible §8 thumbnail target) |
| `pack` | 720 | jpeg 80 / webp 74 | ≤ **120 KB** (art bible §8 display-copy cap; measured 61.9 KB today) |
| `detail` | 1200 | jpeg 82 / webp 76 | **target ≤ 150 KB, hard cap ≤ 210 KB** (art bible §8 amendment, ratified 2026-11-22) |
| `download` | 1600 | jpeg 85 / webp 80 | **target ≤ 350 KB, hard cap ≤ 500 KB** (art bible §8 amendment) |

`webp` is the **default** where the client advertises it (`Accept: image/webp`) or asks for
it explicitly with `format=webp`; `jpeg` is the fallback and the default everywhere else.
The art-bible §8 amendment (**done**, 2026-11-22) carries this 360 / 720 / 1200 / 1600 ladder
and the WebP-with-JPEG-fallback rule, so §8 and this table agree. AGENTS.md's "sharp
thumbnails … dev/QA only" line still needs its one-line sync (Open Questions, item 8).

#### No-original rule

1. **Every error path returns an error body or a neutral placeholder, never the source.**
2. Only fixed renditions exist. There is no `w=`/`h=`/`q=` parameter surface, so no request
   can ask the server to transcode an arbitrary size or quality.
3. The manifest stops advertising a source URL: no emitted field addresses `photos/<file>`.
   `src` / `view` survive as deprecated fields pointing at bounded renditions.
4. Residual exposure: direct static URLs (`/photos/<file>`) bypass PHP entirely. Deny them
   via `.htaccess` `<FilesMatch>` and/or keep the photo store above the webroot where the
   host allows — **HOST-VERIFIED-PENDING**.

#### Error taxonomy (image endpoints)

| Status | When | Body | Headers |
| --- | --- | --- | --- |
| `404` | name not in the allowlist, or file gone | JSON `{ "error": "missing" }` | `no-store` |
| `415` | unsupported or corrupt source (HEIC with no Imagick), unknown `size`/`format`, undecodable EXIF | JSON `{ "error": "unsupported" }` | `no-store` |
| `413` | source over the configured byte/pixel limits (below) | JSON `{ "error": "too_large" }` | `no-store` |
| `503` | encoder failure, cache write failure, lock timeout | generated neutral placeholder at the requested rendition size, or JSON for `?list=1` | `no-store`, `Retry-After: 1` |
| `405` | any method other than `GET`/`HEAD` | empty | `no-store`, `Allow: GET, HEAD` |

Bodies never contain server paths, exception text, or the source's pixel dimensions; a 4xx
never carries image bytes. `X-Content-Type-Options: nosniff` and
`Referrer-Policy: same-origin` stay on every response (PRD §5 Security), including errors.

#### Pre-decode safety limits

Enforced **before** any decode, from `filesize` + `getimagesize` only — a 60 MP file is
rejected without ever becoming a 240 MB GD bitmap:

- compressed file ≤ **20 MiB** (configured constant) → else `413`
- pixels ≤ **24 MP** and either edge ≤ **8000 px** → else `413`
- decode-memory guard: need ≈ `w × h × 4 × 1.5`; if that exceeds the PHP memory limit minus
  headroom → `413` instead of a fatal error mid-response
- `GET`/`HEAD` only; `HEAD` returns the same headers with a zero-length body
- EXIF orientation applied (rotate/flip) before resizing; re-encode strips EXIF/GPS —
  verified by inspection, not assumed
- extension **and** signature allowlist; `basename` + `realpath` inside the photo store only

#### Rendition cache

- **Key** = `sha256(source identity | mtime | size | rendition | format | quality | pipeline
  version)`. The pipeline version is a hard-coded constant bumped whenever resampling,
  quality or limit settings change — a settings change invalidates every derived file
  without touching sources. (The current `md5(name|mtime|size)` misses rendition, format,
  quality and pipeline version; a quality change today silently keeps stale files.)
- **Concurrency**: per-rendition `flock` on `<key>.lock`; render into `<key>.<pid>.tmp`,
  then `rename()` (atomic on the same filesystem). Bounded wait: if the lock is not acquired
  within ~2 s, serve the existing cached file if there is one, else `503` + `Retry-After`.
  Two visitors hitting a cold photo cause one render, not two.
- **Location**: outside the webroot where the host permits (`../elsa-derivatives/`), else
  `photos/.cache/` with an `.htaccess` deny — never publicly listable, never in the manifest.
- **Pruning**: opportunistic, on a small random fraction of cache misses — drop files older
  than 30 days, then enforce a total-size cap oldest-first. No cron, no admin surface.
- Long `max-age` is safe precisely because the URL contains the source version: replacement
  photos produce new URLs, so no cache can serve a superseded image.

### Manifest shape

```jsonc
{
  "generated": "2026-11-01T09:34:10.827Z",   // ISO date
  "source": "photos",                        // 'photos' | 'demo' (make-demo.mjs)
  "photos": [
    {
      "id": "elsa-01",                       // slugified, server-side deduped with -2, -3 …
      "ver": "9f3a1c2d",                     // NEW source version: short hash of mtime+size

      // NEW, preferred: every rendition the UI may use, with its own pixel size
      "images": {
        "tile":   { "jpeg": "photos.php?image=elsa-01.jpg&size=tile&format=jpeg&v=9f3a1c2d",
                    "webp": "photos.php?image=elsa-01.jpg&size=tile&format=webp&v=9f3a1c2d",
                    "w": 270, "h": 360 },
        "pack":   { "jpeg": "…&size=pack&format=jpeg&v=9f3a1c2d",   "webp": "…", "w": 540, "h": 720 },
        "detail": { "jpeg": "…&size=detail&format=jpeg&v=9f3a1c2d", "webp": "…", "w": 900, "h": 1200 },
        "download": "photos.php?download=elsa-01.jpg&v=9f3a1c2d"
      },

      // DEPRECATED but still emitted (backward compatibility, one release):
      "src":    "photos.php?image=elsa-01.jpg&size=detail&format=jpeg&v=9f3a1c2d",
      "thumb":  "photos.php?image=elsa-01.jpg&size=tile&format=jpeg&v=9f3a1c2d",
      "view":   "photos.php?download=elsa-01.jpg&v=9f3a1c2d",

      "filename": "elsa-01.jpg",
      "caption": "",                         // string OR { "de": "…", "en": "…" }
      "alt":    { "de": "…", "en": "…" },    // string OR Localized
      "name":   { "de": "…", "en": "…" },
      "mood":   { "de": "…", "en": "…" },
      "description": { "de": "…", "en": "…" },
      "rarity": "",                          // '' | 'common' | 'rare' | 'holo' (F23 override)
      "demo": false,                         // true ⇒ sample card (never empty site, PRD §7)
      "heic": false,
      "width": 5712,                         // SOURCE dimensions — aspect ratio authority
      "height": 3840
    }
  ]
}
```

**`ver` — cache invalidation without redeploy.** A short hash over `mtime` + `size`, carried
in every derivative URL as `&v=`. The owner FTP-drops a replacement photo → mtime and size
change → the hash changes → the manifest advertises new URLs → every layer (browser, CDN,
IONOS cache) fetches fresh bytes, while everything else keeps its 1-year `immutable` entry.
This is what makes the long `max-age` in the endpoint table safe rather than a
stale-content bug. Cheap to compute (`stat` only), so no hash pass over the photo store.

**`images` — per-rendition URLs.** Every entry is a fixed rendition, never the source, and
carries its own `w`/`h` so a component can never render a rendition at the wrong ratio.
The top-level `width`/`height` keep describing the **source** aspect ratio, which is what
`CardTile`'s `object-fit: cover` window depends on — renditions preserve that ratio, so the
existing CLS contract is untouched.

**Backward compatibility rules** (binding for every consumer):

1. Unknown fields are ignored; `images` and `ver` are **optional**. Absent `images` →
   fall back to the bounded `thumb` (tile) and to `src`, which now points at the `detail`
   rendition — **never at a file**. Absent `ver` → request the URL without `&v=`.
2. A legacy `src` of the form `photos/<file>` (the v1 static `photos.json` shape, still
   present in the owner's old file) normalizes as **metadata only**: it is retained for
   bookkeeping and is **never rendered, never emitted as an image URL**. Rendering falls back
   to a bounded derivative — `images.*` when present, else the pre-built
   `photos/thumbs/<name>.jpg` (sharp, ≤ 720 px) in the static-fallback deployment. If
   neither exists the card is `unavailable`, not the source. This is the one place where a
   v1 manifest could otherwise smuggle the original back into the UI.
3. `normalize.ts` is still the single funnel: it types `images`, validates that each URL is
   same-origin and under `photos.php` (or a `photos/thumbs/` derivative), and **drops the
   `images` block** (counting it) rather than trusting a cross-origin or `photos/<file>` URL.
   A malformed derivative block degrades to the deprecated fields; it never becomes a
   source-image request.
4. The static fallback (`photos.json`, no PHP) emits the same shape, with `derivatives/`
   produced ahead of time by the sharp scripts. PHP stays optional.

`captions.json` (owner-authored, per-photo) is merged server-side by `photos.php`;
the client never reads it directly.

### Manifest v2 extension — optional, backward compatible

Three **optional** fields per photo; every consumer must treat them as absent. Unaffected
by the derivative contract above (v1.1 adds `ver` / `images` independently of these):

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
| Images on cards/binder | fixed renditions only: `tile` 360 px ≤ 45 KB, `pack` 720 px ≤ 120 KB (longest edge) | `?image=…&size=` fixed matrix; CI byte assertion below |
| Detail dialog | `detail` 1200 px, ≤ 210 KB hard cap (150 KB target) | dedicated rendition, never the source |
| Download ("Foto speichern") | `download` 1600 px, ≤ 500 KB hard cap (350 KB target) | explicit user action only, `Content-Disposition: attachment` |
| Originals | **never requested by the UI** | no manifest field addresses `photos/<file>`; `?view=` 302s to `?download=` |
| Derivative byte bound | every response bounded, and **never equal to the source byte length** | CI job: `php -S` + repo `photos.php`, assert per rendition `Content-Length ≤ ceiling` and `≠ filesize(source)`; same assertion in the release checklist against IONOS, plus a Playwright route-mock that fails if the client ever requests a `photos/` URL |
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
| | `derivative-failed` | `?image=` returns 404/415/413 | one retry against the next-smaller rendition (detail → pack → tile); if that also fails, the placeholder state below. Never falls back to the source |
| | `unavailable` | `?image=` returns 503 (+ `Retry-After`) | same downgrade chain; the card renders its printed text, no error chrome |
| | `image-failed` | every rendition fails (R7 HEIC worst case) | card frame stays readable, printed text carries the card (PRD R7) |
| localStorage | `ok` / `unavailable` | write/read throws | continue with in-memory defaults; never block the visit; reset button disabled with explanation |
| Share | `native` / `clipboard` / `denied` | API presence / promise result | visible confirmation per state; never silent failure (F25) |
| Audio | `enabled` / `silent` | context creation fails or muted | no error UI, sound toggle reflects intent |
| HEIC in-browser | `converted` / `native` / `failed` | heic2any load/draw | failed → image-failed state above (R7) |

Rule: **every async consumer declares its terminal states in a discriminated
union**, and every terminal state has bilingual copy. A component cannot render
"nothing" for a state it forgot. Terminal image states never resolve to the original bytes:
the downgrade chain stops at the placeholder, and the source is not in the client's address
space at all (no manifest field points at `photos/<file>`).

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
├─ photos.php                  # runtime: ?list=1 (manifest) + ?image= (tile|pack|detail)
│                              # + ?thumb= (720 alias) ?download= (1600) ?view= (302 → download)
├─ photos.json                 # static manifest fallback (same v1.1 shape; PHP optional)
├─ photos/
│  ├─ <original>.jpg|jpeg|heic # source store — FTP drop target; never rendered by the UI
│  ├─ thumbs/<slug>.jpg        # sharp: pre-built tiles for the static-fallback deployment
│  ├─ captions.json            # owner-authored, merged server-side
│  └─ .cache/                  # derivative cache — ONLY if the host forbids a dir above
│                              # the webroot; .htaccess-deny + never listable (ADR-0008)
├─ ../elsa-derivatives/        # preferred derivative cache, outside the webroot
│                              # (gitignored, host-created, same key/atomic-rename rules)
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
- **Derivative bound (image contract)**: in a CI job running the repo's `photos.php` under
  `php -S` — for each rendition assert `Content-Length ≤` its ceiling **and** `≠
  filesize(source)`; assert `?image=…&size=orig|huge` → 415, `?view=` → 302 with no image
  body, a missing name → 404 and a 60 MP fixture → 413, all with `Cache-Control: no-store`;
  assert a replacement file (new mtime) changes `ver` and therefore the URL. In Playwright:
  a request-log assertion that no request in any flow targets `photos/<file>` or an
  unbounded `?image=` URL — the client-side half of the no-original rule. The same
  byte-bound script runs against IONOS in the release checklist (CI has no PHP host).
- Layout: no horizontal overflow at 320/390/414/640/1280/1920 (F17); card zones
  never overflow at the longest permitted strings (budget strings injected).
- a11y: axe-core pass (WCAG 2.2 AA) on the built bundle, verifying the contrast
  gate's token math holds in rendered output.
- Privacy: zero third-party requests on a clean run (request-block audit).

**Test-plan conflicts — resolved (follow UX v2, not the old test plan).** Three conflicts
flagged against the earlier test plan are settled by the UX v2 documents and ADR-0003 scope;
tests must assert the v2 behaviour, and a v1-derived assertion is a defect, not a requirement:

- **C2 (swipe)** — no swipe interaction exists. Tests assert `P`, `←/→`, `Esc`, tab order and
  click only; any copy mentioning swiping fails the interaction-copy audit (see Testing, Vitest).
- **C4 (verb "gesammelt"/"collected")** — the archive's copy verb is owned by the UX v2 docs and
  the narrative source, not by the test plan; tests assert the v2 strings through `i18n.t`, never
  a hard-coded v1 verb.
- **C5 (storage keys)** — `lucky-elsa.*` envelopes and migration are ADR-0003 scope; tests assert
  the envelope schema and `wipe()` semantics from ADR-0003, and must not pin v1 bare keys.

**Styling enforcement belt (mandatory CI, per ADR-0002).**

- Stylelint on component-scoped CSS: raw values forbidden — consumption only via
  `var(--elsa-*)` / `var(--tier-*)` — and **duplicate selectors as errors**.
- Cross-file selector-diff check: Stylelint is per-file, so a scripted repo-level
  diff catches duplication across component CSS files.
- Svelte 5 unused-CSS warnings escalated to CI errors.
- knip: dead token/recipe/exports fail the build.
- CSS byte budget in the bundle check (includes generated `styled-system/` output).

CI order: `svelte-check --tsgo` + `tsc --noEmit` → Stylelint + cross-file diff +
knip → Vitest (incl. contrast gate) → build + bundle-budget check → image-derivative
byte assertion (`php -S`) → Playwright. `scripts/qa.mjs`'s checks are absorbed here.

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
**This v1.1 revision *is* the ADR-0008 change** (`docs/adr/ADR-0008-image-derivatives.md`):
the endpoint set in the derivative-contract table and the manifest shape carrying `ver` +
`images` are the new frozen contract; `?view=`-as-original is withdrawn, and no future change
to sizes, formats, error statuses or manifest image fields may land without superseding
ADR-0008.

---

## Known-Defect Prevention Matrix

| v1 defect | Structural prevention |
| --- | --- |
| Card content overflows its fixed frame | Fixed-percentage zone grid in `CardTile` + hard character budgets in `budgets.ts`, truncated at `CardView` build time, pinned by unit test + overflow e2e |
| Holo promotion applied to a copy → rarity diverges between pack and binder | `PackSlot { photoId, promoted }` slots instead of copied records; frozen `PhotoRecord`; one `rarity.ts` for both contexts; dedicated invariant test |
| Fetch failure and empty archive collapsed into one state | `ManifestStatus` discriminated union with separate `network-error` / `empty` phases + route-mocked e2e |
| Thumbnail endpoint fell through to `serveFile($path)` → a *thumbnail* request delivered the 3.98 MB original (measured 2026-11-22; 64× overdraw) | Closed parameter surface (only `tile`/`pack`/`detail`/`download` exist; no `w=`/`h=`/`q=`) + **no-original rule** (every error path returns an error body or placeholder) + `ver`-keyed immutable derivative cache + CI byte-bound assertion (`Content-Length ≤ ceiling` **and** `≠ filesize(source)`) + Playwright assertion that no request targets `photos/<file>` |
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
| ADR-0008 | Image derivative & manifest contract (`?image=` renditions, `ver`, no-original rule, cache) | The owner's FTP flow, the runtime image path and the byte budget all meet here; required before the derivative layer ships |

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
5. **PHP 8.6 deprecation hygiene for image endpoints** (blocking for the derivative layer):
   remove every `imagedestroy()` call (photos.php:356/360/431/441/448) — the function is
   deprecated in PHP 8.5+ and its notice can be printed into the response, corrupting JPEG
   bytes at exactly the moment the encoder succeeded — and set `display_errors=0` (plus
   `log_errors=1`) for image endpoints so no notice can ever precede image bytes. Verify by
   rendering with `error_reporting=E_ALL` and asserting the byte stream still starts with the
   JPEG/WebP magic number and keeps its declared `Content-Length`.
6. **Derivative cache placement + host capability probe**: probe writability above the
   webroot, GD `imagewebp`/`imageavif`, `memory_limit`, and `.htaccess` deny support on
   IONOS; record results in the ADR-0008 Consequences (HOST-VERIFIED-PENDING).

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

Image-contract follow-ups (ADR-0008; do not block the derivative layer, but land before release):

6. **PRD R4 wording must be restated.** PRD R4 currently reads "the original only in the
   dialog and in 'Foto speichern'". The ratified contract replaces both: the dialog uses the
   **1200 px `detail` rendition** and "Foto speichern" uses the **1600 px `download`
   rendition** — the source is never sent to a browser. Owner edit to `PRD.md` §5 / R4
   (architecture cannot edit the PRD); until it lands, this document is the binding version.
7. **Art bible §8 amendment — DONE (2026-11-22).** §8 now carries the 360 / 720 / 1200 / 1600
   ladder and WebP-default-with-JPEG-fallback, and the byte ceilings here are aligned with it
   (tile ≤ 45 KB, pack ≤ 120 KB, detail 150 KB target / 210 KB cap, download 350 KB target /
   500 KB cap). No further action; recorded so nobody re-opens it.
8. **AGENTS.md photo-pipeline line needs a one-line sync.** AGENTS.md still says "Node/sharp
   scripts generate thumbnails and crop anchors for local dev/QA only". It should read
   "sharp generates `photos/thumbs/` + `derivatives/` for dev/QA and the static fallback;
   `photos.php` renders the fixed runtime renditions". Owner edit — AGENTS.md is binding for
   every agent, so it must not drift from this architecture.
