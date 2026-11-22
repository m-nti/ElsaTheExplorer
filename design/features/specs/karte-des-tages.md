# Karte des Tages / Card of the Day — Feature Spec

> **Status**: Draft · **Author**: systems-designer · **Last Updated**: 2026-11-22
> **Implements / depends on**: `mechanics.md` §1 — the one surface that differs between two visits. Needs the manifest (`photos.php`), wing totals (`collection-meta.md` R-A/R-C), trait names (`archive-fiction.md` §4), copy deck. **Static, no server state, no new storage**; `lucky-elsa.seen.v1` is read-only here.
> **Build phase**: Full Vision — build-order step 4 (ships with Wings; the forecast needs per-wing totals).
> **Conflict on record**: `feature-slate.md` kills "Karte des Tages" *as a surface* and `archive-fiction.md` §6 bans the phrase as vocabulary. This spec keeps the mechanism only as a **non-expiring, display-only bulletin**; the player-facing title is an owner ruling (§6). Nothing here expires, is missable or is rewarded.

## 1. Purpose

A bulletin strip in the catalogue header: today's card, read-only, plus **Elsa-Prognose** over three trait groups. Ten seconds, dry, warm, no obligation. It is the only thing that differs between two identical visits.

**It is not a reward.** The tile is display-only: it collects nothing, opens nothing, writes nothing, grants no stamp or milestone and never touches the pack's unseen-first pool (`mechanics.md` I2/I4, `collection-meta.md` R-K). Missing a day costs nothing and is never mentioned — the exact condition the slate's kill verdict demanded. No `lucky-elsa.*` key is written; refused storage (private window) changes nothing.

## 2. Data Model (derived every render, never stored)

`DayBulletin = { dateKey: string; cardId: string | null; forecast: { trait: 'sofa'|'vigilance'|'travel'; value: number }[]; mode: 'empty'|'standard'|'capstone' }`, derived from `(manifest, seen.v1, clock)`; `cardId = null` hides the module.

**Formula 1 — day selection**

`dateKey = pad4(y) + "-" + pad2(m+1) + "-" + pad2(d)` from `getFullYear()/getMonth()/getDate()` — **never** `toISOString`, `toLocaleDateString` or any UTC path. `s = dateKey + "|" + salt`, `h = FNV1a32(utf8(s))`, `index = h mod N`, `cardId = sortedIds[index]`, where `sortedIds` is the manifest ids sorted by code-unit order (lexicographic, locale-independent).

| Symbol | Type | Range | Description |
|---|---|---|---|
| `dateKey` | string | 10 chars, `YYYY-MM-DD` | local calendar date, zero-padded |
| `salt` | string | constant `elsa.tag.card` | per-surface salt; changing it reshuffles the calendar |
| `h` | uint32 | 0–4 294 967 295 | FNV-1a 32-bit over `s` (offset `0x811C9DC5`, prime `0x01000193`) |
| `N` | int | 0–500 | manifest size |
| `index` | int | 0–N−1 | position in the sorted id list |
| `cardId` | string \| null | one manifest id, or null | the day's card |

**Output range:** `index` is always `0…N−1` — `h` is unsigned, so no negative index and no division. `N = 0` → `cardId = null`, module hidden (not an empty bulletin). **Bias:** plain `h mod N` favours the first `2³² mod N` indices by ≤ 1/2³² relative (< 1.2·10⁻⁷ at N ≤ 500) — invisible in a once-a-day read; `mechanics.md`'s rejection-sampling `pick` can replace it later without changing this contract. **Worked example:** `2026-11-22` → `s = 2026-11-22|elsa.tag.card` → `h = 0x699AAA84 = 1771743876`; `N = 24` → `1771743876 mod 24 = 12` → `sortedIds[12]`; the next day hashes to `0x0C012FD4` → `20`, a different card.

**A manifest change may re-map today's card.** `index` is stable; `sortedIds[index]` is not. Inserting or removing a photo before position `index` shifts today's card mid-day on the next recompute. Accepted: the bulletin is a reading suggestion, not a claim, and it writes nothing that could go stale. Do not add a "pinned" id to compensate — that is storage and a second source of truth.

**Formula 2 — forecast trait**

`trait = round(10 × collectedInWings / totalInWings)`

| Symbol | Type | Range | Description |
|---|---|---|---|
| `collectedInWings` | int | 0–`totalInWings` | seen ids whose wing is in the union |
| `totalInWings` | int | 0–500 | manifest members of the union |
| `trait` | int | 0–10 | forecast value, displayed as `{value}/10` |

Wing unions (slugs from R-A): `sofa = nap-wing ∪ portrait-room` · `vigilance = guard-room` · `travel = departure-hall ∪ garden-annex`. `ball-room` and `new-acquisitions` belong to no union — they still count for `p_all`, they just have no forecast line.

**Output range:** 0 when the union has nothing collected (including seen ids outside it) … 10 when it is complete; monotone non-decreasing, never negative, never above 10; `round` is half-up. `totalInWings = 0` → the line is **omitted**, the formula not evaluated (no `0/0`, no "0 von 0", `collection-meta.md` E4). **Worked example:** Ruhesaal 3/8 + Porträtsaal 1/4 → `round(10 × 4/12) = round(3,33) = 3`; completing the union → `12/12 → 10`.

**Mode:** `capstone` when `|seen ∩ manifest| = N ≥ 1`; `empty` when `|seen ∩ manifest| = 0`; else `standard`. Capstone keys off the **whole catalogue**, not off three traits reading 10 — otherwise uncollected Ballsaal cards would be silently declared complete.

## 3. State Machine

| State | Entry | Render | Exit |
|---|---|---|---|
| `hidden` | `N = 0`, or no valid date | nothing in the DOM (no `<section>`) | manifest gains a card |
| `empty` | 0 collected, `N ≥ 1` | tile + `tag:empty`; no trait lines | first collection write |
| `standard` | 1…N−1 collected | tile + up to three trait `<dd>` lines | collection completes, or reset |
| `capstone` | all `N` collected | tile + `tag:capstone`; no trait lines | a new photo (99 %), or reset |
| `stale` (overlay) | local date advanced since the last evaluation | the previous render stands, unchanged and self-consistent | any event in §4 |

## 4. Interaction Map & Rollover

| Action | Mouse | Touch | Keyboard |
|---|---|---|---|
| Read | hover does nothing; no cursor change | tap does nothing | `Tab` passes over it — no focusable child inside |
| Open or collect the card | **not offered** — no button, no link, no lightbox, no collection path | same | same |

**Rollover without a timer.** Recompute `dateKey` and re-render on `document.visibilitychange` (→ visible), `window.focus`, `pageshow`, and after every collection write. **No `setInterval`, no `setTimeout`, no countdown, no "new in …".** The recompute is silent: no live-region message, no motion, no announcement.

**Accepted staleness.** A tab left open across midnight keeps yesterday's bulletin until one of those events fires. This can never mislabel: the date text and the card render from the same `dateKey`, so a stale render is a coherent yesterday, not a wrong today. The worst case is a visitor who never refocuses or collects seeing one card all evening — acceptable, because nothing is missed by not looking.

## 5. Accessibility (Standard tier)

- `<section aria-labelledby>` with an `<h2>`; the date is `<time datetime="YYYY-MM-DD">` whose text comes from `Intl.DateTimeFormat` in the page language.
- The card's printed name is real text beside the tile; the photo plate is `aria-hidden="true"` with `alt=""` (the name is not duplicated into an alt).
- Forecast is a `<dl>`: `<dt>` = trait name, `<dd>` = `{value}/10`. Values are text, never a bar, gauge or tint.
- Empty, standard and capstone differ by **text**, never by colour, dimming or an icon; all text ≥ 4.5:1 on the catalogue surface.
- Nothing is focusable inside, so no focus trap and a silent rollover cannot move the visitor's focus. Motion: none, or opacity-only ≤ 100 ms (`prefers-reduced-motion` removes even that). No sound.

## 6. Copy Keys (DE/EN — all PROPOSED, no copy-deck entry exists yet)

| Key | DE | EN |
|---|---|---|
| `tag:title` | Der Aushang | The Bulletin |
| `tag:cardLabel` | Heute ausgestellt | On display today |
| `tag:forecast:label` | Elsa-Prognose | Elsa's forecast |
| `tag:forecast:value` | {value}/10 | {value}/10 |
| `tag:empty` | Noch nichts gesammelt. Die Prognose erscheint mit der ersten Karte. | Nothing collected yet. The forecast appears with the first card. |
| `tag:capstone` | Der Bestand ist vollständig. Die Prognose entfällt. | The holdings are complete. No forecast needed. |
| `tag:note` | Wechselt mit dem Kalendertag. Nichts verfällt. | Changes with the calendar day. Nothing expires. |

- Trait names are **not** new strings: reuse `lex:<trait>:term` (`archive-fiction.md` §4 — Sofakomfort/Sofa comfort, Wachsamkeit/Vigilance). **Reiselust has no Lexikon pair yet** — add one to §4 before build (its §6 rule 5 forbids first use without definition).
- The date line reuses `print:date` ("Stand: {date}" / "As of: {date}") — one key, no duplicate. `tag:title` deliberately avoids "Karte des Tages" (allowed vocab only, `du`-register, zero exclamation marks); an owner ruling to the contrary is a copy-deck change, not a code change.

## 7. Acceptance Criteria (binary)

1. GIVEN a fixed manifest and a fixed local date, WHEN the module renders twice, THEN `cardId`, `dateKey` and every trait value are identical (DE and EN).
2. GIVEN 30 consecutive dates, WHEN each renders, THEN `lucky-elsa.seen.v1` is byte-identical afterwards, no other key was created, and no recompute emitted a live-region message.
3. GIVEN the tile, WHEN inspected, THEN it holds no `<button>`, `<a>`, dialog trigger or stamp, and clicking it mutates no state.
4. GIVEN `2026-11-22`, `N = 24`, salt `elsa.tag.card`, WHEN the index is computed, THEN it is `12` (hash `0x699AAA84`); with a 25th id injected before position 12, THEN the index stays `12` and the card changes.
5. GIVEN 0 collected, WHEN the section renders, THEN `tag:empty` shows and no trait line exists; GIVEN all collected, THEN `tag:capstone` shows and no trait line exists.
6. GIVEN Ruhesaal 3/8 and Porträtsaal 1/4, WHEN Sofakomfort renders, THEN it reads `3/10`; GIVEN a union with zero members, THEN its line is absent and no `0/0` appears.
7. GIVEN a collection write, `visibilitychange`, `focus` or `pageshow`, WHEN it fires, THEN the bulletin re-evaluates exactly once; GIVEN midnight passes with no such event, THEN the previous `dateKey` and card stand (accepted staleness).
8. GIVEN a pack opening, WHEN the draw runs, THEN it is unaffected by the bulletin (no read of, or write to, the walk pool).
9. GIVEN `N = 0` or an implausible device year, WHEN the page loads, THEN no `<section>` exists in the DOM and no exception is logged.
10. GIVEN DE and EN, WHEN the language switches mid-read, THEN `dateKey`, index and every trait value are unchanged and only the strings change.

## 8. Build Phase

Build-order step 4, once wing totals exist: pure selectors in one module (`fnv1a`, `dateKeyOf`, `pickIndex`, `forecast`, `modeOf`) with Vitest fixed-vector tables → `<section>` component on Panda CSS tokens (no scoped-CSS colours) → rollover wiring with Playwright clock injection → DE/EN rows added to the copy deck. Nothing to migrate on reset: the module owns no key.

## 9. Edge Cases

- **Offline / manifest failure:** no manifest → `hidden`; the catalogue's own error state speaks. No cached card is ever shown as today's.
- **Clock change:** local components only, so DST and timezone travel cannot shift the date mid-day the way a UTC path would. A backwards jump re-renders an earlier day (correct, not an error); a year outside `[2000, 2100]` → `hidden` rather than a farcical date.
- **`N = 1`:** `h mod 1 = 0` every day — the same card daily, no special string, no fallback card invented.
- **0 % / 1 %:** empty line at zero; with one collected card the traits already compute (a union may read 1–10) — no floor, no "unlock at five".
- **100 % / 99 %:** capstone line at 100 %; a new photo drops `p_all` to 0.99 and the three trait lines return on the same render (no stored mode).
