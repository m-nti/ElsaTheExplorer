# Sonderausstellung / Special Exhibition — Feature Spec

> **Status**: Draft · **Author**: systems-designer · **Last Updated**: 2026-11-22
> **Implements**: PRD §1 pillar ("a folder of photos is browsed; a pack is *opened*") — the collection becomes something the visitor can hang for someone else.
> **Depends on**: `collection-meta.md` R-B (seen-set is the only collection state), R-E (storage contract), Share Button clipboard plumbing, `interaction-patterns.md` Card Browsing → *URL & fragment preservation*. **New storage**: `lucky-elsa.exhibition.v1` (ordered `string[]`, no envelope, no timestamp).
> **Build phase**: Alpha — build-order step 5 (after Wings, with reset-scope work). No server, no account, no network write.

## 1. Purpose

A **Sonderausstellung** is a curated set of up to five *collected* cards the visitor hangs together and can send as one link. It is the collection's first outbound artifact: not a score, not a reward, an exhibition. Museum register, dry humour, at most one exclamation mark per surface and never in errors. It must work with no server: the whole share is in the URL hash, and nothing about the sender beyond the five photo ids travels.

**Decision (explicit — this reverses an earlier draft of this spec, whose text was wrong, not merely stale):** the previous version of this paragraph required the share payload to carry **sorted** ids, so that the same five works always produced an identical link, with the visitor's arrangement held in storage only. **That decision is reversed.** Ids travel in **visitor order**. The arrangement *is* the artefact: it is the one thing the reorder controls in §4 exist to produce, and a sorted link would make every one of them meaningless in the only surface where the arrangement leaves the browser. Consequences, all binding:

- The shared view renders in **hash order**, never in catalogue order.
- The derived exhibition number is seeded by the **ordered** ids (mechanics.md X6), so two arrangements of the same five works are two exhibitions with two different numbers and two different links.
- Order travels; nothing else about the sender does. If a "cover work" is ever wanted, that is a **v2 payload**, not a silent change.

## 2. Data Model

```ts
// lucky-elsa.exhibition.v1 — written by the exhibition module only, never by the five collection verbs.
type Exhibition = string[];   // ordered photo ids, 1–5, all ∈ seen.v2 ∩ manifest — no envelope, no timestamp
```

- **Shape**: a bare ordered array. The `.v1` in the key *is* the version — there is no `{ v: 1, ids }` envelope and no `updatedAt` (mechanics.md, new storage). Position in the array is the work's position in the exhibition.
- **Order is stored verbatim**: written exactly as hung, never sorted, never re-compacted.
- **`[]` is never persisted.** Removing the last work **removes the key**, so `absent` (no key) and `empty` (key holding zero ids) can never diverge. The stored state is always 1–5 ids.
- Derived at render: `resolved = ids.filter(id => manifest.has(id))`, `missing = ids.length − resolved.length`.
- Read defensively (parse in try/catch, `Array.isArray`, every element a string matching `/^[A-Za-z0-9._-]{1,64}$/`, **dedupe keeping the first occurrence**, **cap 5 keeping the first five**). Malformed → treat as absent, rewrite on next write.
- Reset clears every `lucky-elsa.*` key (R-J) — this key included; no special-case code.
- **Privacy**: ids are already public in `photos.php`; the hash contains ids only — no names, seen-set, counts, language, timestamps or device data. The only inference a recipient can make is *which five works the sender chose*, which is the feature.

### URL hash codec (versioned, compact, order-preserving)

`#ausstellung/1/<comma-joined encodeURIComponent(ids)>` — each id is `encodeURIComponent`d **before** joining with `,`, so a `,`, `/` or `#` occurring inside an id can never split the payload.

- Decode: split the fragment on `/` → `["#ausstellung", "1", payload]`. First segment not `ausstellung` → no share (`none`). Version ≠ `1` → refused (`version`); ids are not imported. Payload split on `,`, each part passed through `decodeURIComponent`.
- **Malformed encoding refuses the payload whole.** If any `decodeURIComponent` throws (a bad `%` escape, a lone surrogate → `URIError`), the entire payload is refused — never partially salvaged, never guessed at.
- **Unknown ids drop per id, with an honest count.** A well-formed id that is merely absent from the manifest is dropped individually and the view says so (`exhibition:missing` = "{n} of {m} works found"). One stale id never fails the share. Duplicates dedupe keeping the first occurrence; surplus beyond 5 drops, keeping the first five.
- **Nothing is re-sorted**, before encoding or after decoding. The decoded array is the exhibition.
- Never truncate an over-long link: refuse it whole (caps below).

**Formula — link length bound**

`hash_len = P + Σᵢ len(enc(idᵢ)) + (n − 1)`

| Symbol | Type | Range | Description |
|---|---|---|---|
| `P` | int | 15 (constant) | length of the `#ausstellung/1/` prefix, `#` included |
| `n` | int | 1–5 | works carried in the payload |
| `idᵢ` | string | 1–64 chars, `[A-Za-z0-9._-]` | a photo id |
| `enc(idᵢ)` | string | 1–64 chars | `encodeURIComponent(idᵢ)`; over the permitted id alphabet every character is unreserved, so `enc(idᵢ) = idᵢ` and its length is unchanged |
| `hash_len` | int | 16–339 | characters in the fragment, `#` included |

**Output range:** integer, bounded, and monotone in `n` and in each `len(idᵢ)`; there is no division, so no unbounded or division-by-zero case exists. Minimum **16** = `n = 1` with a 1-character id (`15 + 1 + 0`); maximum **339** = `n = 5` with five 64-character ids (`15 + 5×64 + 4`).

Two values the system cannot use are flagged rather than clamped:

- **`n = 0`** makes the formula degenerate (`15 + 0 + (−1) = 14`) and would emit a bare `#ausstellung/1/`. The writer is required to **refuse** — a share needs ≥ 1 id, so the empty case never reaches the codec.
- **`n > 5`** is truncated at the *encoder* by the cap in §2, never silently by the length formula.

**Defensive cap 512.** The decoder refuses any fragment longer than **512** characters *before* parsing. 339 is the canonical maximum, so 512 is headroom, not a design target: it absorbs a future manifest whose ids legitimately exceed 64 characters, while keeping a hostile or corrupted multi-kilobyte fragment away from `decodeURIComponent` entirely.

**Worked example:** five 36-character UUID ids → `Σ len(enc(idᵢ)) = 180`, separators `= 4`, `hash_len = 15 + 180 + 4 = 199` characters.

### Fragment rule (binding — replaces the earlier `history.replaceState` sentence)

The earlier draft's line, *"`history.replaceState` removes the hash after the shared view is dismissed or imported"*, was true only of dismissal and said nothing about the writer that actually loses the fragment. The rule is now stated positively:

- A shared view must survive the visitor opening a work. The lightbox mutates **only the `photo` search param**, on a `URL` built from `location.href` (`url.searchParams.set("photo", id)` / `url.searchParams.delete("photo")`, then `history.replaceState(null, "", url.href)`).
- It **never assigns `location.hash`** and **never rebuilds the URL** from its components — a hand-built string silently drops the fragment.
- **Only the exhibition view's own dismiss clears `#ausstellung/…`.** No other pattern — Dialog Open/Close, Card Browsing, Language Toggle, Pack flow — may touch it. `?photo` and `#ausstellung/…` are independent, so a recipient can deep-link a single exhibit *of* an exhibition and closing it returns to the gallery.
- Full pattern: `design/ux/interaction-patterns.md` → Card Browsing → *URL & fragment preservation*.

## 3. State Machine

| State | Entry | Render | Exit |
|---|---|---|---|
| `absent` | no key, no hash | empty-state CTA (catalogue non-empty) | add → `draft` |
| `draft` | 1–4 local ids | list + "add" enabled | 5th add → `complete`; all removed → `absent` |
| `complete` | 5 local ids | list, "add" disabled + limit line | remove → `draft` |
| `shared` | hash present | read-only list **in hash order**, import button, writes nothing | dismiss → `absent`/local state restored; import → `draft`/`complete` |
| `viewing` (overlay) | a work opened from `shared` or `imported` | the same exhibition **stays behind** the standard lightbox — nothing unmounted, nothing re-rendered, fragment untouched | lightbox close → returns to the state it was opened from, **no announcement** |
| `imported` | import confirmed | local state, hash cleared, one announcement | normal editing |
| `stale` (overlay) | `missing > 0` | found works **in hash order** + `exhibition:missing` — "{n} of {m} works found" — no error state | curator restores photo, or visitor removes the id |

**Opening a work keeps the exhibition behind it.** The shared view is not a dialog and is not replaced when an exhibit opens: the standard lightbox opens *over* it, the gallery underneath is never unmounted, and closing the lightbox returns to the same scroll position, the same focus anchor and the same fragment. Because nothing was lost, **returning from the lightbox fires no announcement** — the live region stays silent (a "back to the exhibition" message would announce a change that did not happen). The only thing that changes across open/close is the `photo` search param.


Shared and local states never merge: opening a link does not overwrite the visitor's own exhibition until *import* is confirmed (if local is non-empty, confirm first).

## 4. Interaction Map

| Action | Mouse | Touch | Keyboard |
|---|---|---|---|
| Add work | "Werk hinzufügen" → picker dialog (collected only) | same, ≥44 px rows | `Tab` → `Enter`/`Space`; picker is a native `<dialog>` |
| Remove | `×` per row | same | `Enter`/`Space`; focus moves to next row, else "add" |
| Reorder | `↑` / `↓` per row (buttons, **no drag-only path**) | same | `Enter`/`Space`; position announced |
| Open work | card → standard lightbox, which opens **over** the exhibition without closing it (already collected ⇒ no new write; `photo` param only) | tap | `Enter`; lightbox close returns focus to the row it was opened from |
| Copy link | "Link kopieren" → clipboard → address-bar fallback | same | `Enter` |
| Import | "Übernehmen" → confirm if local non-empty | same | `Enter`; Cancel is default focus in the confirm |
| Clear | "Ausstellung leeren" behind confirmation | same | same |

Picker rows for uncollected cards are visibly disabled and labelled "noch nicht gesammelt" — no silent failure. **Reorder is the artefact** (see §1): the shared view renders in hash order, so moving a work changes the link and the exhibition number — that is the whole point of the `↑`/`↓` controls.

## 5. Accessibility

- Section = `<section aria-labelledby>`; list = `<ul>`; each row a `<li>` with the card name as text, controls as real `<button>`s with names that include the work ("Nach vorn: Kissen mit Aufsicht").
- Read-only state is carried by text ("Geteilte Ausstellung — nur ansehen"), never by disabled-looking styling alone; the import button is the one action.
- Live region (`polite`), one message per action: add, remove, reorder position, limit, import result, unknown-id count. No per-row chatter. **No announcement on returning from the lightbox** — the exhibition was never unmounted, so nothing changed to announce.
- The shared view is a `<section>`, not a dialog: it is announced once on arrival and remains the page's content while a work is open over it.
- No motion beyond the standard 200 ms fade; no auto-play, no carousel; reduced motion changes nothing functionally.
- Focus: picker returns to "add"; remove re-anchors as in §4; shared view lands on its heading; lightbox close returns focus to the work's row; hash dismissal restores focus to the catalogue.
- The hash is never required to use the feature; the on-page exhibition is the full-fidelity path.

## 6. Copy Keys (DE / EN placeholders — index-aligned in `COPY.de` / `COPY.en`)

**No string asserts five.** The cap lives in one place — the placeholder `{cap}` (= 5 today) — and every count that could differ at runtime is passed in as `{n}` or `{m}`. A string that hardcodes the number five is a defect: it silently breaks if the cap moves and it lies whenever `{m} < 5`.

**Placeholders**: `{cap}` = the maximum number of works (currently 5, single source in the exhibition module) · `{m}` = works carried by *this* exhibition / link (1–5) · `{n}` = a count of resolved or affected works · `{i}` = 1-based position · `{name}` = card name · `{nr}` = derived exhibition number. Placeholder sets are index-aligned per language and asserted equal by test (mechanics.md I5).

| Key | DE | EN |
|---|---|---|
| `exhibition:title` | Sonderausstellung Nr. {nr} | Special Exhibition No. {nr} |
| `exhibition:lede` | Bis zu {cap} Werke, von dir gehängt. | Up to {cap} works, hung by you. |
| `exhibition:empty` | Noch keine Werke gehängt. Wähle bis zu {cap} gesammelte Karten. | No works hung yet. Choose up to {cap} collected cards. |
| `exhibition:add` | Werk hinzufügen | Add a work |
| `exhibition:count` | {n} von {m} Werken | {n} of {m} works |
| `exhibition:limit` | {cap} Werke sind das Maximum. | {cap} works is the maximum. |
| `exhibition:remove` | Aus der Ausstellung nehmen: {name} | Remove from the exhibition: {name} |
| `exhibition:moveUp` / `moveDown` / `position` | Nach vorn: {name} / Nach hinten: {name} / {name}, Platz {i} von {m} | Move earlier: {name} / Move later: {name} / {name}, position {i} of {m} |
| `exhibition:readOnly` | Geteilte Ausstellung — nur ansehen. | Shared exhibition — view only. |
| `exhibition:import` | In meine Ausstellung übernehmen | Take into my exhibition |
| `exhibition:imported` | Übernommen: {n} von {m} Werken. | Taken over: {n} of {m} works. |
| `exhibition:missing` | {n} von {m} Werken im Archiv gefunden. | {n} of {m} works found in the archive. |
| `exhibition:gone` | Diese Ausstellung ist im Archiv nicht mehr zu finden. | This exhibition can no longer be found in the archive. |
| `exhibition:share` / `copy` | Link zur Ausstellung kopieren / Link kopiert. | Copy link to the exhibition / Link copied. |
| `exhibition:copyError` | Link konnte nicht kopiert werden. Er steht in der Adresszeile. | Could not copy the link. It is in the address bar. |
| `exhibition:notCollected` | Nur gesammelte Karten können ausgestellt werden. | Only collected cards can be exhibited. |

A test greps `COPY.de` / `COPY.en` for a bare numeral next to "Werk"/"work" and fails the build on any hit.

## 7. Acceptance Criteria (binary)

1. GIVEN no key and a non-empty catalogue, WHEN the section renders, THEN the empty state shows and no `lucky-elsa.exhibition.v1` is written.
2. GIVEN 4 works, WHEN a 5th collected card is added, THEN 5 ids persist; WHEN a 6th is attempted, THEN nothing is written and the limit announcement fires once.
3. GIVEN a work in the list, WHEN remove is activated by keyboard, THEN the id is gone, the live region names it, and focus lands on the next row or "add".
4. GIVEN a link with five valid ids, WHEN opened, THEN the view is read-only, renders them **in hash order** (not catalogue order), renders nothing unknown, and writes zero storage keys.
5. GIVEN a link with 2 stale ids, WHEN opened, THEN the 3 resolvable works render in hash order with the "{3} of {m}" note from `exhibition:missing`, no error state.
6. GIVEN a link whose ids are all stale, WHEN opened, THEN `exhibition:gone` renders with a link to the catalogue.
7. **(rewritten off base64)** GIVEN a fragment whose version is not `1`, or whose payload throws on `decodeURIComponent` (bad `%` escape, lone surrogate), or whose length exceeds the 512-char defensive cap, WHEN decoded, THEN the payload is refused whole, not one id is imported, and no exception escapes.
8. **(replaces the voided sorted-identity criterion)** GIVEN five ids hung in a chosen order, WHEN the link is copied and reopened, THEN the shared view and the stored copy both present exactly that order — positions preserved 1:1, never re-sorted.
8a. **(the reversal's own evidence)** GIVEN the same five ids in two different arrangements, WHEN each copies its link, THEN the two fragments differ and the two derived exhibition numbers differ — two arrangements are two exhibitions, not one canonical link.
9. GIVEN an uncollected card, WHEN the picker is open, THEN it cannot be added and says "noch nicht gesammelt".
10. GIVEN reset confirmed, WHEN the page re-renders, THEN the key is gone and the section is `absent` again.
11. GIVEN the picker, list, reorder, share and import controls, WHEN traversed by keyboard only, THEN every action completes with a visible focus ring and no pointer-only path exists.
12. **(fragment survival)** GIVEN a shared exhibition is open, WHEN a work is opened in the lightbox and then closed, THEN `location.hash` is **byte-identical** before and after (Playwright: capture `location.hash`, `openCard`, close, compare), and only the `photo` search param changed.
13. GIVEN a shared exhibition with a work open in the lightbox, WHEN the lightbox closes, THEN the exhibition is still rendered underneath (never unmounted), focus returns to that work's row, and no live-region announcement fires.
14. GIVEN any `exhibition:*` string with a count placeholder, WHEN the cap or the exhibition size differs from 5, THEN every rendered string reads correctly — no copy string asserts the number five.

> **Voided:** the former AC 8 (*"the same five ids in two different local orders … both hash strings are byte-identical"*) tested the sorted-payload decision that §1 now reverses. It is struck, not relaxed: passing it would prove the feature is broken.

## 8. Build Phase

Alpha, build-order step 5: requires the seen-set, clipboard plumbing and reset-scope sweep (catalogue canonical order is **no longer** a dependency — §1 reverses the sorted payload). Order inside the step:

1. **codec** — pure, Vitest: round-trip preserves order, stale id drops per id, duplicate dedupe-keeps-first, version reject, malformed-`%` reject, 512-char cap, 339-char canonical max.
2. **storage module** — `setExhibition(ids)` single verb, `[]` deletes the key, defensive read (dedupe/cap 5/keep order).
3. **picker / list UI** — Playwright: add, remove, reorder, focus management, cap at `{cap}`.
4. **URL writer + fragment test** — the `photo`-param-only writer *and* its test land here, before any shared view can be rendered: build the writer against a `URL` from `location.href`, then assert with a fixture `#ausstellung/1/…` that the fragment is byte-identical across open/close. This is a build step, not a footnote — X9 was a shipped defect, and a shared view built on top of an unproven writer would re-ship it.
5. **shared view + import** — read-only render in hash order, `exhibition:missing` count, import with confirmation.

No dependency on print or on the Ehrenmensch.
