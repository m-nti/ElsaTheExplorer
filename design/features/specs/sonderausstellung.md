# Sonderausstellung / Special Exhibition — Feature Spec

> **Status**: Draft · **Author**: systems-designer · **Last Updated**: 2026-11-22
> **Implements**: PRD §1 pillar ("a folder of photos is browsed; a pack is *opened*") — the collection becomes something the visitor can hang for someone else.
> **Depends on**: `collection-meta.md` R-B (seen-set is the only collection state), R-E (storage contract), Catalogue canonical order, Share Button clipboard plumbing. **New storage**: `lucky-elsa.exhibition.v1`.
> **Build phase**: Alpha — build-order step 5 (after Wings, with reset-scope work). No server, no account, no network write.

## 1. Purpose

A **Sonderausstellung** is a curated set of up to five *collected* cards the visitor hangs together and can send as one link. It is the collection's first outbound artifact: not a score, not a reward, an exhibition. Museum register, dry humour, no exclamation marks. It must work with no server: the whole share is in the URL hash, and nothing about the sender beyond the five photo ids travels.

**Decision (explicit):** the share payload carries **sorted** ids, so the same five works always produce the identical link; the visitor's local arrangement (order) is kept in storage but is *not* part of the shared artifact. A shared view renders in canonical catalogue order. If a "cover work" is ever wanted, that is a **v2 payload**, not a silent change.

## 2. Data Model

```ts
// lucky-elsa.exhibition.v1 — written by the exhibition module only, never by the five collection verbs.
type Exhibition = { v: 1; ids: string[] };   // 0–5 unique ids, visitor order, all ∈ seen.v1 ∩ manifest
```

- Derived at render: `resolved = ids.filter(id => manifest.has(id))`, `missing = ids.length − resolved.length`.
- Read defensively (parse in try/catch, `v === 1`, `Array.isArray`, ids matching `/^[A-Za-z0-9._-]{1,64}$/`, dedupe, cap 5). Malformed → treat as absent, rewrite on next write.
- Reset clears every `lucky-elsa.*` key (R-J) — this key included; no special-case code.
- **Privacy**: ids are already public in `photos.php`; the hash contains ids only — no names, seen-set, counts, language, timestamps or device data. The only inference a recipient can make is *which five works the sender chose*, which is the feature.

### URL hash codec (versioned, compact)

`#ausstellung=v1.<payload>`, `payload = base64url(UTF-8(ids.sort().join("\n")))`, no `=` padding.

- Decode: split version at the first `.`; version ≠ `1` → reject. `atob` + `TextDecoder({fatal:true})`; failure → reject whole payload (never guess).
- **Tolerance**: per id, drop unknown-to-manifest, malformed, duplicate and surplus (beyond 5) ids. Never fail the share for one stale id. Canonical order = catalogue order.
- Never truncate an over-long link: refuse it whole.
- `history.replaceState` removes the hash after the shared view is dismissed or imported (Back stays clean).

**Formula — link length bound**

`hash_len = P + ceil(4·B / 3)`, `B = Σ len(idᵢ) + (n−1)`

| Symbol | Type | Range | Description |
|---|---|---|---|
| `P` | int | 16 (constant) | length of `#ausstellung=v1.` |
| `n` | int | 0–5 | works in the payload |
| `idᵢ` | string | 1–64 chars, `[A-Za-z0-9._-]` | photo id |
| `B` | int | 0–324 | newline-joined UTF-8 payload bytes |
| `hash_len` | int | 16–448 | characters added to the URL |

**Output range:** 16 (empty payload) to 448. **Hard cap 480** characters for the full hash value; anything longer is refused, never truncated. **Worked example:** five 36-char UUID ids → `B = 184` → `hash_len = 16 + 246 = 262`.

## 3. State Machine

| State | Entry | Render | Exit |
|---|---|---|---|
| `absent` | no key, no hash | empty-state CTA (catalogue non-empty) | add → `draft` |
| `draft` | 1–4 local ids | list + "add" enabled | 5th add → `complete`; all removed → `absent` |
| `complete` | 5 local ids | list, "add" disabled + limit line | remove → `draft` |
| `shared` | hash present | read-only list, import button, writes nothing | dismiss → `absent`/local state restored; import → `draft`/`complete` |
| `imported` | import confirmed | local state, hash cleared, one announcement | normal editing |
| `stale` (overlay) | `missing > 0` | found works + missing count, no error state | curator restores photo, or visitor removes the id |

Shared and local states never merge: opening a link does not overwrite the visitor's own exhibition until *import* is confirmed (if local is non-empty, confirm first).

## 4. Interaction Map

| Action | Mouse | Touch | Keyboard |
|---|---|---|---|
| Add work | "Werk hinzufügen" → picker dialog (collected only) | same, ≥44 px rows | `Tab` → `Enter`/`Space`; picker is a native `<dialog>` |
| Remove | `×` per row | same | `Enter`/`Space`; focus moves to next row, else "add" |
| Reorder | `↑` / `↓` per row (buttons, **no drag-only path**) | same | `Enter`/`Space`; position announced |
| Open work | card → standard lightbox (already collected ⇒ no new write) | tap | `Enter` |
| Copy link | "Link kopieren" → clipboard → address-bar fallback | same | `Enter` |
| Import | "Übernehmen" → confirm if local non-empty | same | `Enter`; Cancel is default focus in the confirm |
| Clear | "Ausstellung leeren" behind confirmation | same | same |

Picker rows for uncollected cards are visibly disabled and labelled "noch nicht gesammelt" — no silent failure. Reorder is local-only (see §1); shared views show one canonical order.

## 5. Accessibility

- Section = `<section aria-labelledby>`; list = `<ul>`; each row a `<li>` with the card name as text, controls as real `<button>`s with names that include the work ("Nach vorn: Kissen mit Aufsicht").
- Read-only state is carried by text ("Geteilte Ausstellung — nur ansehen"), never by disabled-looking styling alone; the import button is the one action.
- Live region (`polite`), one message per action: add, remove, reorder position, limit, import result, unknown-id count. No per-row chatter.
- No motion beyond the standard 200 ms fade; no auto-play, no carousel; reduced motion changes nothing functionally.
- Focus: picker returns to "add"; remove re-anchors as in §4; shared view lands on its heading; hash dismissal restores focus to the catalogue.
- The hash is never required to use the feature; the on-page exhibition is the full-fidelity path.

## 6. Copy Keys (DE / EN placeholders — index-aligned in `COPY.de` / `COPY.en`)

| Key | DE | EN |
|---|---|---|
| `exhibition:title` / `lede` | Sonderausstellung · Fünf Werke, von dir gehängt. | Special Exhibition · Five works, hung by you. |
| `exhibition:empty` | Noch keine Werke gehängt. Wähle bis zu fünf gesammelte Karten. | No works hung yet. Choose up to five collected cards. |
| `exhibition:add` | Werk hinzufügen | Add a work |
| `exhibition:limit` | Fünf Werke sind das Maximum. | Five works is the maximum. |
| `exhibition:remove` | Aus der Ausstellung nehmen: {name} | Remove from the exhibition: {name} |
| `exhibition:moveUp` / `moveDown` / `position` | Nach vorn: {name} / Nach hinten: {name} / {name}, Platz {i} von {n} | Move earlier: {name} / Move later: {name} / {name}, position {i} of {n} |
| `exhibition:readOnly` | Geteilte Ausstellung — nur ansehen. | Shared exhibition — view only. |
| `exhibition:import` | In meine Ausstellung übernehmen | Take into my exhibition |
| `exhibition:imported` | Übernommen: {n} von 5 Werken. | Taken over: {n} of 5 works. |
| `exhibition:missing` | {n} von 5 Werken im Archiv gefunden. | {n} of 5 works found in the archive. |
| `exhibition:gone` | Diese Ausstellung ist im Archiv nicht mehr zu finden. | This exhibition can no longer be found in the archive. |
| `exhibition:share` / `copy` | Link zur Ausstellung kopieren / Link kopiert. | Copy link to the exhibition / Link copied. |
| `exhibition:copyError` | Link konnte nicht kopiert werden. Er steht in der Adresszeile. | Could not copy the link. It is in the address bar. |
| `exhibition:notCollected` | Nur gesammelte Karten können ausgestellt werden. | Only collected cards can be exhibited. |

## 7. Acceptance Criteria (binary)

1. GIVEN no key and a non-empty catalogue, WHEN the section renders, THEN the empty state shows and no `lucky-elsa.exhibition.v1` is written.
2. GIVEN 4 works, WHEN a 5th collected card is added, THEN 5 ids persist; WHEN a 6th is attempted, THEN nothing is written and the limit announcement fires once.
3. GIVEN a work in the list, WHEN remove is activated by keyboard, THEN the id is gone, the live region names it, and focus lands on the next row or "add".
4. GIVEN a link with five valid ids, WHEN opened, THEN the view is read-only, in canonical order, renders nothing unknown, and writes zero storage keys.
5. GIVEN a link with 2 stale ids, WHEN opened, THEN 3 works render with the "3 of 5" note, no error state.
6. GIVEN a link whose ids are all stale, WHEN opened, THEN `exhibition:gone` renders with a link to the catalogue.
7. GIVEN version ≠ 1, bad base64, invalid UTF-8 or a hash > 480 chars, WHEN decoded, THEN it is refused whole and no exception escapes.
8. GIVEN the same five ids in two different local orders, WHEN each copies its link, THEN both hash strings are byte-identical.
9. GIVEN an uncollected card, WHEN the picker is open, THEN it cannot be added and says "noch nicht gesammelt".
10. GIVEN reset confirmed, WHEN the page re-renders, THEN the key is gone and the section is `absent` again.
11. GIVEN the picker, list, reorder, share and import controls, WHEN traversed by keyboard only, THEN every action completes with a visible focus ring and no pointer-only path exists.

## 8. Build Phase

Alpha, build-order step 5: requires the seen-set, catalogue order, clipboard plumbing and reset-scope sweep. Order inside the step: codec (pure, Vitest: round-trip, stale ids, version reject, length cap) → storage module → picker/list UI (Playwright: add/remove/reorder/focus) → shared view + import. No dependency on print or on the Ehrenmensch.
