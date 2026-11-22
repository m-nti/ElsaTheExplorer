# ADR-0004: Manifest contract v2 — `ver`/`images`/`set`/`focus`/`chase`, additive and compatible

- **Status**: **Accepted (owner decision, 2026-11-22)** — amended **A-1** (2026-11-22): the `focus` row default is restated as `center 42%` (§5, ticket #63; ADR-0011 R4)
- **Deciders**: owner (final), technical-director (author)
- **Amends**: `docs/architecture.md` v1.2 — "Manifest shape", "Manifest v2 extension", "Resolution chain"; ratifies the manifest half of ADR-0008 and the amendment `docs/photo-pipeline-implementation.md` §14.4 requests (`pipeline`, `ladder`, `renderable`, `ver`, `images`, width/height — and settles `srcset`).
- **Related**: `ADR-0008` (rendition ladder, no-original rule), `ADR-0001` (PHP optional, FTP flow), `docs/decisions.md` D-02/D-07, `design/gdd/collection-meta.md` R-G

## Context

The manifest is the only data contract. `photos.php?list=1` emits it at runtime so the owner can
FTP-drop a photo and reload with no redeploy (PRD §7; architecture principle 3); `photos.json`
emits it when PHP is absent; `make-demo.mjs` emits it for sample content. Three emitters, one
consumer type — drift between them is the failure mode.

v1 entangled two problems: `src` addressed the original file, and the shape carried no cache
identity, so a replaced photo invalidated nothing. ADR-0008 closed the image surface with `ver`
+ `images`; this ADR ratifies the complete v2 contract — including the optional
`set`/`focus`/`chase` fields the collection needs — and the rules that let an old client meet a
new manifest and a new client meet the owner's old file.

## Decision

### 1. One contract, three emitters, one funnel

`ManifestV2` is one TypeScript type. `photos.php?list=1`, `photos.json` and demo data produce
it; `src/lib/data/normalize.ts` is the only consumer entry (`normalize(raw) → { photos, dropped,
reasons }`). No component, store or SW handler parses a manifest body. A parity fixture test
normalizes one logical catalogue through all three and asserts identical `PhotoRecord`s.

### 2. Fields

Manifest level: `generated` (ISO, required), `source` (`'photos' | 'demo'`, required),
`pipeline` (int, optional — rendition pipeline version), `ladder` (`Record<rendition, px>`, optional — `{tile,pack,detail,download}` longest-edge values),
`photos[]` (required).

Per photo — required: `id` (slug, unique), `width`/`height` (oriented **source** dimensions; the
aspect-ratio authority). Optional, every one defaulted:

| Field | Type / default | Rule |
| --- | --- | --- |
| `ver` | string ≤ 32 | Hash of `mtime`+`size`; cache-buster, not a secret. Absent → URLs without `&v=`. |
| `aspect` | number | Emitted convenience value (`width/height`); **not authoritative** — consumers derive from `width`/`height`. |
| `images` | `Record<'tile'\|'pack'\|'detail'\|'download', { jpeg: url, webp: url, w, h }>` | Fixed renditions, same-origin, under `photos.php` or `photos/thumbs/`. `download` is a rung too (its own `?download=` action, still `jpeg`+`webp`+`w`+`h`). Missing → deprecated aliases. |
| `src` / `thumb` / `view` | string | **Deprecated bounded aliases** → `detail` / `pack` / `download` rung. Never a file. |
| `download` | string | Accepted synonym of the `images.download` rung; `normalize()` maps it onto that rung (jpeg + webp + `w`/`h`) so a consumer reads one shape. |
| `caption` | `string \| Localized` | Displayed as authored. |
| `alt`,`name`,`mood`,`description` | `string \| Localized` | `Localized = string \| {de,en}`; missing `en` falls back to `de` **and counts**. |
| `rarity` | `'' \| 'common' \| 'rare' \| 'holo'` = `''` | `''` ⇒ stable id hash (F3); an override wins and never changes photo bytes. |
| `set` | `string \| null` = `null` | Grouping tag; absent/unknown ⇒ *Neuzugänge* (D-07). |
| `focus` | `{x,y}`, each a number 0..1 — no default object | Absent ⇒ no opinion: the renderer uses **`center 42%`** (`object-position`; ADR-0011 R4, art-bible §7, `sizes.photo-anchor`), never `50% 50%`. Explicit values clamp to 0..1; a wrong **type** drops the entry. |
| `chase` | boolean = `false` | Content marker only: never feeds the rarity hash, never overrides F3. One per manifest; extras ignored and counted. |
| `renderable` | boolean = `true` | Computed by `?list=1` from size/pixel caps **without decoding**; `false` renders the printed frame, never an image request. |
| `demo`,`heic`,`filename` | bool/bool/string | v1 metadata retained (`demo` drives sample-card copy). |

Unknown fields are ignored, never an error — that is what makes the contract additive.

### 3. Compatibility rules (binding on every consumer)

1. `images` and `ver` optional. Absent `images` → bounded `thumb` (720 pack) and `src` (1200
   detail). Absent `ver` → request without `&v=`.
2. A legacy `src` of the form `photos/<file>` is **metadata only**: retained, never rendered,
   never emitted as an image URL. Rendering falls back to `images.*`, else pre-built
   `photos/thumbs/<name>.jpg`; if neither exists the card is `unavailable`.
3. Any `images` URL that is cross-origin or addresses `photos/<file>` causes the **whole block
   to be dropped and counted** — it degrades to the aliases, never to a source request. This is
   the one place a v1 manifest could smuggle the original back.
4. A missing/duplicate `id`, non-numeric or non-positive `width`/`height`, or a wrongly typed
   mandatory field ⇒ the entry is **dropped and counted** (`status.dropped`), never half-kept.
   Later duplicates of a seen id are dropped; the server already disambiguates with `-2`, `-3`.
5. Records are `Object.freeze`d at normalization; rarity is derived once, there.

### 4. `srcset` is derived, not transmitted

The manifest carries per-rendition URLs plus `w`/`h`; the component composes `srcset`/`sizes`.
A manifest-supplied attribute string is **not** accepted — data would choose arbitrary URLs and
break the typed ratio that CLS 0 depends on. The photo-pipeline `srcset` hook is satisfied here.

### 5. Change control

"Manifest shape" + this ADR are the contract. Changing field semantics, rendition names or error
statuses requires superseding this ADR or ADR-0008, not a PHP patch. Additive optional fields are
the normal path: a table row here plus a normalize rule.

#### A-1 — `focus` default restated as `center 42%` (2026-11-22, ticket #63)

The `focus` row used to state a 0.5 / 0.5 centre pair as the absent-value default. That was the
manifest-neutral anchor, not the value the design renders: ADR-0011 R4 ruled one "no opinion"
anchor, `center 42%` (art-bible §7, `sizes.photo-anchor`, `CardFace.svelte`), because faces sit
high in Elsa's photographs. The field keeps no default object — absent still means *no opinion* —
and the renderer supplies `center 42%`. Type, the 0..1 clamp and the wrong-type drop rule are
unchanged, so no emitter, normalizer or consumer behaviour moves; the restatement is recorded
here because §5 makes a default change a semantics change.

## Consequences

**Positive** — the owner's workflow is untouched (one drop, one reload, no rebuild); old clients
survive new manifests and a new client never requests an original; `normalize` is the single
security-relevant URL gate; the contract can grow without a version bump or a coordinated release.

**Negative / accepted costs** — hand-written guards instead of a schema library (no dependency,
more code); tolerance means a `captions.json` typo yields a default rather than an owner-visible
error, so `dropped`/`reasons` must surface in UI and tests; `width`/`height` describe the source
ratio while `images.*.w/h` describe each rendition — two ratios that must agree, pinned by test;
`chase` is data only (printing/framing is a design decision).

## Performance Implications

`?list=1` stays a `stat` + `getimagesize` pass — `renderable` needs no decode — so listing cost is
unchanged. One manifest request per boot; every advertised URL is an immutable `ver`-keyed
derivative, so repeat visits cost zero image revalidation. Growth is metadata only, well under the
2 MB snapshot cap (ADR-0009); a 500-photo fixture is the size guard.

## Alternatives Considered

| Alternative | Why rejected |
| --- | --- |
| Keep the v1 shape | The measured 3.98 MB detail request and the unauditable cache stay; ADR-0008 becomes unenforceable. |
| Separate endpoint / `?v=2` | Doubles emitters and client paths for an additive contract; old clients would read the old endpoint forever. |
| Make `images`/`ver` required | Breaks the owner's existing `photos.json` and the static fallback on day one. |
| JSON Schema + validator | A runtime dependency and a second source of truth; the guards are small and the parity test is the real guarantee. |
| Manifest-supplied `srcset` | Data would choose URLs and ratios, defeating the no-original rule and the CLS contract. |
| Per-locale manifests | Two cache entries that can diverge, double snapshot budget, network round trip on language switch. |
| Client reads `captions.json` | An extra public endpoint and a second merge path; merging stays server-side. |
| Server assigns rarity | Rarity must be stable per id and derivable offline (F3); id hash + explicit override is the single source. |

## References

- `docs/architecture.md` v1.2 — Manifest shape / v2 extension / Resolution chain
- `docs/adr/ADR-0008-image-derivatives.md`, `ADR-0001-stack.md`
- `docs/photo-pipeline-implementation.md` §13–§14 · `docs/test-plan.md` §4.1, §5.7
- `docs/decisions.md` D-02/D-07 · `design/gdd/collection-meta.md` R-G/R-H
