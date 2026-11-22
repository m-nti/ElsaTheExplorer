# UX Review Re-run — D4 (#4)

**Date:** 2026-11-22 · **Reviewer:** ux-designer (skill `/ux-review`, checklist 3A)
**Ticket:** #4 · **Branch:** `docs/d4-ux-review-rerun` · **Reviewed base:** `6b9c50a`
**Scope:** the four UX specs in `design/ux/` — not the pattern library as a document, but the library is the SSOT every spec is checked against.
**Inputs:** `design/ux/{binder,card-detail,pack-opening,stage-landing}.md`, `design/ux/interaction-patterns.md`, `design/accessibility-requirements.md` (Standard, committed), `design/copy/copy-deck.md` (string SSOT), `PRD.md` §4 (F1–F26), `design/registry/entities.yaml`.

## Verdict vocabulary

The ticket asks for **PASS / CONCERNS / NOT ASSESSED / FAIL**; the skill's words are **APPROVED / NEEDS REVISION / NOT ASSESSED / MAJOR REVISION NEEDED**. This report uses the ticket's words and maps them:

| Ticket word | Skill verdict |
|---|---|
| PASS | APPROVED |
| CONCERNS | NEEDS REVISION |
| NOT ASSESSED | NOT ASSESSED |
| FAIL | MAJOR REVISION NEEDED |

Line numbers in findings are **at the reviewed base `6b9c50a`**; the resolution column names the fixing commit (`158ea05`, this PR).

## Summary

| Spec | Pre-fix | Post-fix | Blocking | Advisory | Primary issue at review |
|---|---|---|---|---|---|
| `binder.md` | CONCERNS | **PASS** | 8 | 1 | Four copy strings contradicted the copy deck; grid keyboard model contradicted the pattern library |
| `card-detail.md` | CONCERNS | **PASS** | 6 | 6 | Swipe/tilt conflict with an owner ruling; close timing; broken §12 table |
| `pack-opening.md` | CONCERNS | **PASS** | 4 | 3 | Focus return and per-card announcement timing contradicted the library and its own §9/§14 |
| `stage-landing.md` | CONCERNS | **PASS** | 4 | 4 | Wireframe and H1 still carried the retired name; EN meta description too |
| `interaction-patterns.md` (cross-check) | CONCERNS | **CONSISTENT** | 4 | 6 | Carried the retired copy and the withdrawn confetti model |
| Cross-document | — | — | 1 | 2 | Three pack copy keys are missing from the deck/registry |

**Totals: 27 blocking, 21 advisory.** 13 advisory items were fixed in this PR; 8 remain open and are listed under *Deferred*.

No dimension was **NOT ASSESSED**: the a11y tier is committed, the pattern library exists, `PRD.md` exists, and all four specs were readable.

---

## Shared findings

### Pattern library was the stale side of three contradictions

- **BLOCKING** — `interaction-patterns.md:246,678,931` still described a *canvas burst* on the holo arrival ("one small canvas burst … ≤ 1.2 s", "the pack dialog owns the single small holo burst", "Confetti burst — Pack dialog only"). `pack-opening.md:353-356,515` withdraws confetti and `motion-sheet §8` reserves it for the capstone. Two documents cannot both be the SSOT for the same screen. **Fixed:** the library now specifies the 520 ms `--elsa-dur-flourish` glint and states confetti is capstone-only.
- **BLOCKING** — `interaction-patterns.md:258` fired the per-card announcement at the card's **entrance**; `pack-opening.md:655` said the same, while `pack-opening.md:480,747` (events + acceptance) fire it at the **settle** frame. **Fixed:** both now say settle; §14's cross-reference note is resolved rather than left as a standing caveat.
- **ADVISORY** — `interaction-patterns.md:63` read "no `inert` phase, foil movement, no confetti" — a missing negation that made the reduced-motion contract self-contradictory. **Fixed.**

### Copy deck is the SSOT and four live strings had drifted from it

- **BLOCKING** — `binder.md:272` and `interaction-patterns.md:668` carried the **EN** milestone announcement with the retired entity name (`"<retired>: {pct} per cent done — {outfit}."`); the deck's `catalogue.milestone` is `"Collection: {pct} per cent done — {outfit}."` Canon (D-04b) forbids the retired name naming the collection.
- **BLOCKING** — `binder.md:279` and `interaction-patterns.md:515` carried the **EN** `reset.body` with the retired entity name ("This clears the …"); the deck says "This clears the **Collection**…".
- All four were the repo's `baseline` canon entries (#31). **Fixed**, and the four `baseline` rows were removed from `scripts/canon-allowlist.json` (`maxBaseline` 7 → 3) so the ratchet cannot re-accept them.

### Three pack strings exist only in the spec

- **BLOCKING (dependency)** — `pack-opening.md:697-708` declares `pack.count`, `pack.card.revealed` and `pack.skipped` as new deck rows; none exists in `design/copy/copy-deck.md` §4, and none is listed in `design/registry/entities.yaml:510-528`. The spec supplies DE/EN values, so it is implementable, but the project law says the deck is the string SSOT. **Deferred** to a follow-up issue (the writer owns the deck and the caps need deriving); B4 must not ship the per-card announcement from spec-local strings.

---

## UX Review: Die Sammlung (binder)

**Document:** `design/ux/binder.md` · **Checklist:** 3A (Template: UX Spec) · **Platform:** Web — mouse/touch/keyboard · **Accessibility tier:** Standard

### Completeness: 15/15 sections present
Header (Status/Author/Platform) · Purpose & Player Need · Player Context · Navigation Position · Entry & Exit · Layout (wireframe + zones + inventory) · States & Variants (loading, empty, error, reset, reduced motion) · Interaction Map · Data Requirements · Events · Transitions · Input Method Checklist · Accessibility · Localization · 10 acceptance criteria.

### Quality issues (8 blocking, 1 advisory)

1. **Wireframe kept the retired room name** [BLOCKING] — `binder.md:164` carried the retired room-name header (`DER … · NACH RÄUMEN`, all caps). The set view is part of Die Sammlung. **Fixed:** `DIE SAMMLUNG · NACH RÄUMEN`.
2. **Milestone announcement contradicted the deck and its own note** [BLOCKING] — `binder.md:441` used `"Sammlung-Meilenstein erreicht: …"` while `:272` and the deck use `"Sammlung: {pct} Prozent geschafft — {outfit}."`, and `:447-450` explicitly calls "Meilenstein erreicht" retired. **Fixed.**
3. **Set-complete announcement truncated** [BLOCKING] — `binder.md:442` announced only `"{Set} ist komplett."`; deck `set.complete.announce` is `"{set} ist komplett. Alle da."`. **Fixed.**
4. **Error announcement used a retired string** [BLOCKING] — `binder.md:445` said `"Die Sammlung lädt nicht gerade."`; deck `state.error.catalogue` (and `binder.md:278`) say `"Die Sammlung kommt gleich wieder."`. **Fixed.**
5. **EN milestone announcement** [BLOCKING] — `binder.md:272`, see shared findings. **Fixed.**
6. **EN reset body** [BLOCKING] — `binder.md:279`, see shared findings. **Fixed.**
7. **Grid keyboard model contradicted the library** [BLOCKING] — `binder.md:291-293,374,426-427,501` made every tile a Tab stop and said arrows *wrap* row-to-row; `interaction-patterns.md` Catalogue Grid Roving Arrows specifies **one Tab stop**, geometry-based arrows that **stop at the grid edge**, and `Home`/`End` for the jumps. An implementer would build the opposite of the reviewed pattern, and 200 tiles would be 200 Tab stops. **Fixed:** §7.1, §11, §12 focus order and §14 now match the library.
8. **View switch contradicted the library** [BLOCKING] — `binder.md:303,359` specified a 180 ms crossfade; View Toggle says "none — instant re-render". **Fixed:** instant, 0 ms, reduced-motion n/a; §4 exit row follows.
9. **View persistence is listed as open while the library decides it** [ADVISORY, open] — `binder.md:532` asks whether the view persists; View Toggle already decides session-only with a playtest revisit. Not closed here (it is an owner question), but the two documents should not read as undecided and decided at once. Recommend resolving at the playtest named in the row.

### GDD Alignment: ALIGNED
`PRD.md` F11 (every card reachable), F13 (progress), F15 (empty state), F26 (reset) are all addressed, with the reset now confirmed and the empty state separated from failure. No GDD requirement is missing from this spec.

### Accessibility: GAPS (not spec-blocking)
- Standard tier matched: focus order documented, announcements specified, no colour-only state (state word + frame texture + text).
- Two contrast rows are honestly marked `[ ] audit` (`binder.md:407,409` — milestone label, badges); they are pre-audit, not failures.
- Inherited risk: hints/badges may render in the `--quiet` token that `design/accessibility-requirements.md:106` flags as likely below 4.5:1. The spec must not sign those rows off before the token is measured.
- Single-tab-stop grid is now the stronger a11y model; the old per-tile Tab did not fail WCAG but made a 200-tile grid punishing.

### Pattern Library: CONSISTENT (after fixes)
Collection Grid Tile · Set Progress Line · Progress Bar · Reset with Confirmation · Card Browsing · Dialog Open/Close · Focus Trap · Empty/Loading/Error · Live Region · Language Toggle all referenced by name and now quoted consistently. No new pattern invented.

### Verdict: PASS (post-fix) · CONCERNS at review
**Blocking:** 8 (all fixed, `158ea05`) · **Advisory:** 1 open
This spec is ready for handoff once the contrast audit closes. The open view-persistence question does not block implementation because §4 already specifies session-only.

---

## UX Review: Card Detail (The Reading Room)

**Document:** `design/ux/card-detail.md` · **Checklist:** 3A · **Platform:** Web — mouse/touch/keyboard · **Accessibility tier:** Standard

### Completeness: 15/15 sections present

### Quality issues (6 blocking, 6 advisory)

1. **Swipe was specified as tilt-only, against an owner ruling** [BLOCKING] — `card-detail.md:340,436,564` said horizontal swipe on the card "never" navigates and that "navigation uses chevrons, never edge swipes". `interaction-patterns.md:345` records the owner ruling as **three redundant inputs** — chevrons, `←`/`→`, and horizontal swipe (≥ ~40 px). The spec would delete a decided input. **Fixed:** a three-step gesture ladder — tap < 8 px flips, 8–39 px drag tilts, ≥ 40 px dominant-horizontal swipe navigates; §5.3 B, §7.1, §11 and §14 agree with the library.
2. **Dialog close timing contradicted the library** [BLOCKING] — `card-detail.md:120,410` used 200 ms; `--elsa-dur-dialog-out` is 160 ms in Dialog Open/Close and Animation Standards. **Fixed** in both places.
3. **The credit strip prescribed the retired wordmark** [BLOCKING] — `card-detail.md:219` (L3, the binding fix for the overlap defect) said the credit is `"Elsen · Erste Auflage"`; the brand is `Elsa the Explorer` and the deck keeps `1. Auflage`. **Fixed:** `"Elsa the Explorer · 1. Auflage"`. The legacy string remains only in the quoted defect history at `:24-30`, where it is evidence.
4. **Capstone subtitle used the retired wording** [BLOCKING] — `card-detail.md:322` read `"Sammlung I · abgeschlossen"`; deck `capstone.subtitle` is `"Sammlung I · vollzählig"` ("abgeschlossen" reads as closed for business). **Fixed.**
5. **The §12 contrast table was broken by inserted prose** [BLOCKING] — `card-detail.md:450-463`: two paragraphs sat between table rows, so `Plate number / mood / rarity chip` and the seven following rows render as plain text, not a table. `npm run gate:tables` passes it — the gate checks existing tables, not orphaned rows (see Deferred). **Fixed:** the table is contiguous; the two paragraphs sit below it.
6. **Stale pack size** [BLOCKING] — `card-detail.md:591` asked whether `←/→` should step "within the five pulled cards"; the pack is four. **Fixed.**
7. **Internal hit-target numbers disagreed** [ADVISORY, fixed] — `:430` said actions ≥ 42 px, `:435` said 38 px visual padded to 44 px. **Fixed:** one statement — ≥ 44 px hit target, 38 px visual padded.
8. **Announcement placeholder did not match its example** [ADVISORY, fixed] — `:498` said `"{number}. {name}. {rarity}."` but the example began `"Nr. 07."`. **Fixed:** `"Nr. {number}. …"`, matching Card Browsing.
9. **"Confetti/halo dressing" zone label implied confetti** [ADVISORY, fixed] — `:174`; the row describes halo/shadow/glare only. Renamed.
10. **The confetti row contradicted the motion sheet** [ADVISORY, fixed] — `:411` said "parent decides" and described a canvas burst; the parent (pack) has withdrawn confetti. **Fixed:** withdrawn here too; the pack owns the glint.
11. **No explicit slow-photo loading state** [ADVISORY, open] — §6 has HEIC-converting and image-error but no row for a slow JPEG. `pack-opening.md` has one ("Image slow or failed"). Add a row so an implementer does not invent a blank.
12. **No resolution criterion** [ADVISORY, open] — §14 has a viewport sweep but no stated render resolution. Add one line.

### GDD Alignment: ALIGNED
`PRD.md` F2, F2a, F3, F12, F18, F20, F21, F23, F25 are each addressed (content, imaginary stats, stable rarity, deep link, dialog actions, keyboard, announcements, overrides, share). No uncovered requirement.

### Accessibility: GAPS (not spec-blocking)
- Standard matched; focus order, announcements, focus-return contract and colour-blind mitigations are present.
- Six contrast rows are pre-audit (`:450,464,466-470`), including the foil-gradient name — the hardest case, correctly left open with an art sign-off dependency.
- Hint row explicitly warns not to assume the `--quiet`/`--muted` pass; consistent with `accessibility-requirements.md:106`.

### Pattern Library: CONSISTENT (after fixes)
Card Tilt & Foil · Card Flip · Card Browsing · Dialog Open/Close · Focus Trap · Share · Save/Download · Pack-Open Button · Close Button · Keyboard Shortcut · Live Region · Error State. The swipe conflict was the only behavioural divergence.

### Verdict: PASS (post-fix) · CONCERNS at review
**Blocking:** 6 (all fixed) · **Advisory:** 6 (4 fixed, 2 open)

---

## UX Review: Pack Opening (The Accession)

**Document:** `design/ux/pack-opening.md` · **Checklist:** 3A · **Platform:** Web — mouse/touch/keyboard · **Accessibility tier:** Standard

### Completeness: 15/15 sections present
§12 lacked the tier line the other three carry; it was the only completeness blemish, now added.

### Quality issues (4 blocking, 3 advisory)

1. **Focus return was wrong when opened from CardDetail** [BLOCKING] — `pack-opening.md:122,433` always returned focus to `#open-pack`, while the entry table (`:115`) accepts a CardDetail trigger. Focus Trap's ladder returns to the trigger that opened the dialog. **Fixed:** the lightbox's "Noch ein Pack" when opened from CardDetail, else `#open-pack`; §7.2 follows §4.
2. **The reveal clock disagreed with itself** [BLOCKING] — `:398,480` said the last card settles at **t ≈ 2.98 s**; §10.1 puts card 4's settle at **2.39 s** (2387 ms) and the pull-back starts in that frame. **Fixed** to 2.39 s in both rows.
3. **Roving wrap contradicted the library** [BLOCKING] — `:417` wrapped `←` from card 1 to card 4 (whole list); Pack Roving Arrows wraps **within the visual row** in the 2 × 2. **Fixed.**
4. **Per-card announcement timing** [BLOCKING] — `:655` said "entrance"; §9 fires `pack:card-landed` and the announcement at the **settle**, and §14 tests settle. **Fixed**, and the §14 cross-reference caveat is now resolved (`:740-743`).
5. **§12 had no tier line** [ADVISORY, fixed] — added the Standard/WCAG 2.2 AA line.
6. **Card-selected announcement placeholder** [ADVISORY, fixed] — `:660` now `"Nr. {number}. …"`, matching Card Browsing/card-detail.
7. **No resolution criterion** [ADVISORY, open] — viewport matrix is complete; add a render-resolution line like the other specs.

### GDD Alignment: ALIGNED
F1 (four cards), F4 (≥ 1 holo via promotion), F5 (no in-pack repeat), F6 (unseen-first), F22 (reduced motion) and F18–F22 (dialog/announcements/share context) are addressed. The 4-card canon and holo-in-3/4 rule are consistent with the deck and registry (`pack_size: 4`).

### Accessibility: GAPS (not spec-blocking)
- Standard matched; the reduced-motion frame is composed rather than stripped; the counter survives it; four announcements + summary with a documented pacing risk.
- Three contrast rows pre-audit (`:620,623,624`), plus the camera-scaled 11 px type audit correctly open (`§15`, `:791`).
- The announcement-pacing question (`:792`) is a real ship gate for VoiceOver; keep it open.

### Pattern Library: CONSISTENT (after fixes)
Card Reveal Step · Dialog Open/Close · Focus Trap · Pack Roving Arrows · Card Tilt (static) · Close Button · Keyboard Shortcut · Live Region · Error State. The confetti withdrawal is now reflected in the library too.

### Verdict: PASS (post-fix) · CONCERNS at review
**Blocking:** 4 (all fixed) + 1 cross-document dependency (copy keys, deferred) · **Advisory:** 3 (2 fixed, 1 open)

---

## UX Review: Stage Landing (Entry Hall)

**Document:** `design/ux/stage-landing.md` · **Checklist:** 3A · **Platform:** Web — mouse/touch/keyboard · **Accessibility tier:** Standard

### Completeness: 15/15 sections present

### Quality issues (4 blocking, 4 advisory)

1. **Wireframe kept the retired name twice** [BLOCKING] — `stage-landing.md:139` used the retired all-caps name as the eyebrow (the deck's `stage.eyebrow` is **Sammlung I**), and `:143` used it as the H1's second line. ASCII wireframes sit outside the canon gate's quoted-string scope, so the gate never saw them. **Fixed:** `SAMMLUNG I`, `IN DER SAMMLUNG?`.
2. **The H1 was ungrammatical and contradicted the deck** [BLOCKING] — `:199,451` wrote `"Was steckt im Sammlung?"`; the deck's `stage.h1` is `"Was steckt in der Sammlung?"` (and the deck records that the rename kept the question, only the entity's name). **Fixed** in both places.
3. **EN meta description kept the retired name** [BLOCKING] — `:461` used the retired entity name ("fill the …"); the deck's `meta.description` says "fill the collection". **Fixed.**
4. **Retired progress verb in prose** [BLOCKING] — `:326` used the retired progression verb for the Zuwachs dismissal key; canon's verb is collected, and the mechanism is "the first new card collected". **Fixed.**
5. **A non-focusable element was numbered in the Tab order** [ADVISORY, fixed] — `:409` numbered the progressbar as stop 9 and then said it is skipped, which makes the sequence read as 10 stops when there are 9. Moved below the list as a note.
6. **Dialog-close focus parenthetical was imprecise** [ADVISORY, fixed] — `:111` said focus lands on the CTA "or the originating pack card" at page level; the pack card is an in-dialog target. Split page-level vs child-spec ownership.
7. **GDD reference range is wider than the screen** [ADVISORY, open] — the header cites F7–F13; F10 (bilingual overrides) and F11 (binder grid) are delivered by card-detail/binder. Narrow the citation or add an explicit "delivered elsewhere" note.
8. **No resolution criterion** [ADVISORY, open] — add a render-resolution line to §14.

### GDD Alignment: ALIGNED (with the range note above)
F7 (German default), F8 (instant switch), F9 (persisted/URL override), F12 (deep link), F13 (progress), F17 (no overflow) are addressed.

### Accessibility: GAPS (not spec-blocking)
- Standard matched; skip link target and label agree; focus order now numbers only focusable stops.
- Two contrast rows pre-audit (`:386-387`); the hint explicitly warns about `--quiet`.
- `#stage` `tabindex="-1"` as a programmatic fallback is the right shape per ADR-0010 §3.

### Pattern Library: CONSISTENT (after fixes)
Pack-Open Button · Dialog Open/Close · Language Toggle · Sound Toggle · Progress Bar · Keyboard Shortcut · Live Region · Empty/Loading/Error.

### Verdict: PASS (post-fix) · CONCERNS at review
**Blocking:** 4 (all fixed) · **Advisory:** 4 (2 fixed, 2 open)

---

## Gates and evidence

| Gate | Result |
|---|---|
| `npm run canon` (base `6b9c50a`) | **128** raw hits in 17 files; 15 in `design/ux/` (4 entity + 11 water/history) |
| `npm run canon` (head `158ea05`) | **124** raw hits in 17 files; **11** in `design/ux/`, all water canon-declaration/history lines that the allowlist covers on Linux |
| Canon baseline | 7 → **3** entries (`maxBaseline` 3); `--json` reports `baseline: 3/3`, `baselineHits: 0` locally |
| `npm run gate:tables` | `table-integrity: clean (364 tables, 45 files)` |
| Rubric artefacts | 4 `## UX Review:` blocks, 4 `### Verdict:` lines |
| copy-deck SSOT | every live string in the four specs now matches `design/copy/copy-deck.md`; 3 declared pack keys still absent (deferred) |

**win32 caveat, stated rather than hidden:** locally the canon allowlist is not applied because `path.relative()` returns backslashes while the allowlist keys use forward slashes, so the run reports raw hits. The meaningful local evidence is the before/after raw count (128 → 124, exactly the four entity hits removed) and `baseline: 3/3`; the authoritative allowlist pass is the Linux CI run.

## Deferred (open, with reason)

1. **`pack.count`, `pack.card.revealed`, `pack.skipped` missing from the copy deck and registry index** — the writer owns the deck and the caps need deriving; **#74** tracks it, B4 is blocked on it for the announcement strings.
2. **`--quiet` contrast + six/three/two pre-audit rows** — measured audit belongs to the a11y pass, not to this review; the specs correctly refuse to claim a pass.
3. **`gate:tables` blind spot** — it validates tables that exist but not orphaned rows after prose; `card-detail.md` §12 passed while broken. **#75** tracks the gate change.
4. **`design/accessibility-requirements.md:123-124,160,163` still says "gesehen / seen" and "~200ms apart"** — stale against the `gesammelt` canon and the 4-card reveal. **#76** tracks it with the a11y pass.
5. **Binder view persistence** — owner/playtest question, not a spec defect.
6. **Card-detail slow-load state and resolution criteria; stage F-range and resolution criterion** — small doc additions, listed above.

## Method note

The review ran the 3A checklist per spec, then cross-checked every quoted duration, string, focus rule and announcement against `interaction-patterns.md` and the copy deck. Where the two disagreed, the library/deck won because the specs themselves declare them SSOT; the one exception is the pack's confetti withdrawal, where `pack-opening.md` + `motion-sheet §8` won and the library was corrected. The four pre-fix verdicts were CONCERNS; the fixes are all docs-only, and the post-fix rubric re-run is PASS with the advisory list above.
