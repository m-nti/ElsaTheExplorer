# ADR-0003: State & Persistence — `lucky-elsa.*` envelopes, v1→v2 migration, reset semantics

- **Status**: **Accepted (owner decision, 2026-11-22)**
- **Deciders**: owner (final), technical-director (author)
- **Amends**: `docs/architecture.md` v1.2 — "Persistence Schema", Boot/Reset event flow, `localStorage` error row; ratifies the key set `docs/test-plan.md` §5.4 (U-PST-20) pins and **C5** blocks on.
- **Related**: `ADR-0009` (PWA keys), `ADR-0001` (first-party only), `design/gdd/collection-meta.md` R-B/R-C/R-E/R-J, `AGENTS.md` (reset clears all keys)

## Context

v1 wrote three bare values — `seen.v1` (array), `sound.v1` (bool), `lang.v1` (string) — with no
schema version, so any shape change had to guess at what it was reading. The refactor adds
completion snapshots and milestones, and ADR-0009 adds four PWA keys. Three documents name the
set differently, which is why test-plan C5 cannot write persistence tests:

| Source | Names |
| --- | --- |
| `architecture.md` v1.2 | `lang.v2`, `sound.v2`, `seen.v2`; `visits.v1`, `install.v1`, `update.v1`, `session.v1` |
| `collection-meta.md` R-E | `seen.v1`, `sets.v1`, `flags.v1`, `lang.v1`, `sound.v1` |
| `design/ux/stage-landing.md` | `lang.v1`, `sound.v1` |

This is a data-loss surface, not a naming preference: a wrong read loses a collection, a wrong
reset leaves personal state on a shared device. The storage namespace is a frozen external
contract (architecture "API Boundaries"), so it is ratified once here.

## Decision

### 1. Namespace and envelope

Every key is `lucky-elsa.<concern>.v<n>`; the suffix **is** the envelope version and equals the
`v` inside: `{ "v": 2, "data": <payload> }`. A key introduced after the v1→v2 migration starts at
`.v1` because it never had a bare v1 value — so `sets.v1` / `flags.v1` (the names the GDD already
uses) need no rename. A shape change bumps `n` and adds a migration step.

### 2. Ratified key register (closed set)

| Key | `v` | `data` | Owner |
| --- | --- | --- | --- |
| `lang.v2` | 2 | `'de' \| 'en'` | `i18n.svelte.ts` |
| `sound.v2` | 2 | `boolean` | `audio.svelte.ts` |
| `seen.v2` | 2 | `string[]` photo ids (order-insensitive) | `collection.svelte.ts` |
| `sets.v1` | 1 | `{ [setId]: { completedAt, memberCount, manifestStamp } }` | collection-meta |
| `flags.v1` | 1 | `{ milestones, lastManifestStamp, diploma, masterIndex }` | collection-meta |
| `visits.v1` | 1 | `number` | `pwa/install.ts` |
| `install.v1` | 1 | `{ dismissed, iosShown }` | `pwa/install.ts` |
| `update.v1` | 1 | `string` (dismissed build hash) | `pwa/register.ts` |
| `session.v1` | 1 | `boolean` in **`sessionStorage`** | `pwa/install.ts` |
| *reserved* | — | `exhibition.v1`, `cardback.v1`, `journal.v1` (Phase 5, per `design/features/`) | — |

Nothing else is ever stored. A new key requires a line here **and** the envelope; a feature PR
alone may not introduce one. `seen` remains the only collection state (R-B); `sets`/`flags` store
completion **events** and stamps, never derived counts (R-C) — wing progress is recomputed.

### 3. Read/write contract

`persistence.svelte.ts` is the only module touching `Storage`. `read(key, parse)` returns
`T | null` and never throws: bad JSON, wrong `v`, failed type guard or storage exception all
yield `null`, and the caller proceeds with defaults. A quota/private-mode failure reports
`localStorage: 'unavailable'`: the app continues in memory and the reset control is disabled
**with an explanation**, never a silent no-op.

### 4. Migration v1 → v2 (boot, idempotent)

1. Read `seen.v1` / `sound.v1` / `lang.v1` leniently, validating every element.
2. Write the `.v2` envelope; **only after success** delete the v1 key.
3. Absent or unreadable v1 keys are not errors — defaults win, no partial state.
4. An existing `.v2` always beats the v1 value, so re-running loses nothing.
5. An unknown-but-higher `v` keeps its bytes, reads as defaults, and is never overwritten
   (forward safety across two tabs on different builds).
6. Non-`lucky-elsa.*` keys are never touched; unknown `lucky-elsa.*` keys are ignored by
   migration but cleared by reset. `seen` is pruned against the manifest at boot.

### 5. Reset ("Von vorn")

`wipe()` enumerates every key with the `lucky-elsa.` prefix and removes it — legacy and unknown
keys included, so a stale build's leftovers cannot survive. One confirmation naming what is lost,
including language and sound (F26/R-J); **cancel performs zero writes** (deep-compare test);
idempotent; no milestone or diploma logic may fire as a side effect. It does **not** clear PWA
caches and does **not** unregister the worker — that is the separate `reset.cache.cta` action
with its own confirmation (ADR-0009 §9). Outcome is the first-visit state: German, sound on,
empty collection.

## Consequences

**Positive** — C5 closes with one register; future schema changes are mechanical; reset is
provably complete on a family device; almost nothing is persisted (no accounts, no identifiers,
nothing leaves the browser), so the privacy claim stays structural (PRD §5).

**Negative / accepted costs** — nine keys and a migration path are more code than v1's three bare
values; paid deliberately (D-08), because the alternative is silent loss. `collection-meta.md`
and `stage-landing.md` still say `.v1` for lang/sound/seen and need a one-line sync (architecture
is binding meanwhile). `sets`/`flags` are registered now but unwritten until B5; tests assert
their absence is legal.

## Performance Implications

Negligible: the largest payload is `seen` (one short id per collected card, pruned at boot). One
migration pass over ≤ 8 keys. `markSeen` writes once per pack, not per card; reads happen once at
boot. No polling, no `storage` event listener.

## Alternatives Considered

| Alternative | Why rejected |
| --- | --- |
| Keep bare v1 keys | Cannot distinguish an old shape from corruption — the guess-driven read this ADR removes. |
| One blob (`lucky-elsa.state.v2`) | One malformed field loses the whole collection, and concurrent tabs overwrite wholesale; per-concern keys give atomic writes and partial recovery. |
| IndexedDB for collection state | Async boot before first paint plus schema machinery for a few kilobytes; IDB stays for ADR-0009's cache index only. |
| `sessionStorage` for preferences | Language/sound must survive the visit; only the per-tab session marker belongs there. |
| Reset over a hard-coded allowlist | Leaves unknown/legacy keys behind — exactly the state a shared device must not retain. |
| Key list kept in a test fixture | Tests would read the spec from the artefact under test. |

## References

- `docs/architecture.md` v1.2 — Persistence Schema, Event Flow (Boot/Reset), Error-State Taxonomy
- `docs/adr/ADR-0009-pwa.md` (keys, separate cache clear), `ADR-0001-stack.md` (first-party only)
- `docs/test-plan.md` §5.4, C5 · `design/gdd/collection-meta.md` R-B/C/E/J · `docs/decisions.md` D-05/D-08
