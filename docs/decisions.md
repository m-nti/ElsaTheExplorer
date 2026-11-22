# Decisions (owner-delegated, 2026-11-22)

The owner delegated the remaining open decisions with one instruction: **best-in-class,
no shortcuts, no time or budget constraint.** These rulings are binding.

## D-01 — PWA: yes

Installable, offline-first. The collection shell, tokens/CSS/JS, the copy deck and the
already-viewed derivatives are cached; the app opens offline and shows the last known
catalogue with an "offline" state. No push notifications, no analytics, no background sync
of personal data. Update flow: new version detected → quiet prompt → reload on confirm.
Recorded in ADR-0009.

## D-02 — Chase card: `elsa-01` ("Blickkontakt-Expertin")

Placeholder for **Das Hauptprätrait / The Portrait of Record** until the owner uploads and
selects the final portrait. Always holo, gold-glint keystone frame, keystone of the
Porträtsaal set. `chase: true` in the manifest.

## D-03 — Epithets: yes, two surfaces

One epithet line appears on the **card back** and in the **reading-room meta line**. Not on
the card face — the face's zone budget belongs to photo, name, story and stats. Epithet copy
comes from `design/narrative/greek-origin.md` §2.

## D-04 — Capstone line (Greek origin)

Approved:
- DE: **"Drei Tage Fahrt, dann blieb sie. Die Sammlung ist vollständig."**
- EN: **"Three days on the road, then she stayed. The collection is complete."**
Used on the Ehrenmensch certificate, under the name.

## D-04b — Collection naming: Die Sammlung / The Collection

The binder/collection entity is **Die Sammlung / The Collection**, not "Die Sammlung / The
Catalogue". Applies to the binder title, progress/completion copy, the tile location badge
("In der Sammlung" / "In the collection"), the series label (**Sammlung I** / **Collection I**),
and the capstone. "Sammlung/catalogue" survives only where it names the archival *concept*
(catalogue number, catalogue register, catalogue-certificate) — never the product entity.

## D-05 — Copy deck §12 closures

| Item | Ruling |
|---|---|
| Reset body | Keep the ratified `reset.body` verbatim; frames are covered by "Räume samt Fortschritt" and are not named separately. |
| 50 % / 75 % outfit clauses | Approved: "Leselampe angezündet." / "Samtband gespannt." (reading lamp lit / velvet rope strung) |
| `demo.mixed` | "Ein paar Karten sind noch Platzhalter. Die echten Fotos kommen dazu, sobald sie da sind." / "A few cards are still placeholders. The real photos join them as they arrive." |
| `capstone.date` | "Eingetragen am {date}." / "Entered on {date}." |
| `stage.cta` register | Keep **"Pack öffnen" / "Open a pack"** — neutral; expedition language belongs to Elsa, not the visitor. |
| `state.error.catalogue` | "Die Sammlung kommt gleich wieder." / "The collection will be back shortly." (no `!`) |

## D-06 — Gotcha Day ritual

Approved: **"Um zwei wird eine Kerze angezündet — die Stunde des Empfangs, sonst nichts."** /
"At two, a candle is lit — the hour of the reception, nothing else." No counter, no reward.

## D-07 — Provisional set assignment (build fixtures only)

Until the owner's editorial pass:

| Room | Provisional cards |
|---|---|
| Ruhesaal | img-0018, img-0132, img-0155, img-2092, img-9949 |
| Außenstelle Garten | 233a150f |
| Abfahrtsaal | — |
| Ballsaal | — |
| Porträtsaal | **elsa-01 (chase)**, img-9319 |
| Wachsaal | img-2225, img-9454 |
| Neuzugänge | everything unassigned |

These are sample data, not canon. The manifest's optional `set` field is authoritative;
unknown/absent → Neuzugänge.

## D-08 — Quality bar

No technical shortcuts. Full typed stack, real tests, real CI gates, PWA, image derivatives,
Standard+ accessibility. If a decision is between faster and better, choose better.

## D-09 — Domain

Assumed for now: **elsatheexplorer** (repo name). Confirm the public domain before deploy.
