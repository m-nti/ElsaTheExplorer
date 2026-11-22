<script lang="ts">
  import CardFace from "$lib/components/CardFace.svelte";
  import { cardStars, type StarCount } from "$lib/domain/card-stars";
  import type { CardFaceModel, CardStat } from "$lib/domain/card";
  import type { RarityTier } from "$lib/domain/rarity";
  import { i18n, isLocale, type Locale } from "$lib/stores/i18n.svelte";

  /**
   * B2 slice fixture (#13, T9, ADR-0002 spike 1) — the QA matrix, not the app.
   *
   * Reached only at `/?slice=1&lang=de|en`; `App.svelte` imports this lazily so
   * the product page never downloads the fixture copy. B3 replaces it with the
   * manifest loader and deletes this file, the import and the flag.
   *
   * Five cards — common, rare, holo (the B1 sample), a 40-character name at the
   * budget edge, and one `renderable:false` card — rendered at five widths:
   * the four in-spec full-card sizes (180–340 px, `sizes.card-min` … `-max`)
   * plus the Binder tile's 148 px minimum (`design/ux/binder.md`, tile grid
   * "min tile 148px"). The tile **band column** (`CARD_ZONES_TILE`) is the
   * Binder's own variant and is not wired into `CardFace` yet, so the 148 px
   * row proves width behaviour only.
   *
   * Copy is fixture copy, not the deck: B3 wires the manifest and the copy
   * deck. Only the fields the clamp measures are localised, and both languages
   * are exercised because DE runs ~40 % longer than EN (test-plan §5.8).
   * The photo is the committed placeholder; the `renderable:false` card points
   * at a URL that must never be requested (E-IMG-09).
   */
  const SLICE_WIDTHS = [148, 180, 220, 280, 340] as const;
  const TILE_WIDTH = SLICE_WIDTHS[0];

  interface Seed {
    readonly id: string;
    readonly number: string;
    readonly rarity: RarityTier;
    readonly serial: string;
    readonly stars: StarCount;
    readonly renderable?: boolean;
    readonly photo: { readonly src: string; readonly width: number; readonly height: number };
    readonly copy: Readonly<Record<Locale, CopyFields>>;
  }

  interface CopyFields {
    readonly name: string;
    readonly mood: string;
    readonly rarityLabel: string;
    readonly edition: string;
    readonly keyword: string;
    readonly story: string;
    readonly printLine: string;
    readonly credit: string;
    readonly alt: string;
    readonly stats: readonly CardStat[];
  }

  const PHOTO = { src: "/img/photo-unavailable.webp", width: 540, height: 720 } as const;
  /** Never served: a request for it is the failure E-IMG-09 asserts against. */
  const UNRENDERED_PHOTO = { src: "/img/never-requested.webp", width: 540, height: 720 } as const;

  const SEEDS: readonly Seed[] = [
    {
      id: "haeufig-01",
      number: "No. 02",
      rarity: "common",
      serial: "ELSA · 0002 / 0005",
      stars: cardStars("common"),
      photo: PHOTO,
      copy: {
        de: {
          name: "Sitzplatz-Expertin",
          mood: "Gelassen",
          rarityLabel: "Häufig",
          edition: "Erste Auflage · Serie I",
          keyword: "Sitzplatz",
          story:
            "Sie prüft jede Sitzfläche der Wohnung und vergibt dann eine Note. Die Bestnote geht an den Stuhl am Fenster, weil dort die Sonne lange bleibt.",
          printLine: "Fantasiewerte · nur zum Spaß",
          credit: "Foto: Hausarchiv",
          alt: "Platzhalter — Foto folgt.",
          stats: [
            { label: "Blick", value: "72" },
            { label: "Schlaf", value: "14 h" },
            { label: "Leckerli", value: "31" },
          ],
        },
        en: {
          name: "Seating-Expert",
          mood: "Composed",
          rarityLabel: "Common",
          edition: "First edition · Series I",
          keyword: "Seating",
          story:
            "She inspects every seat in the flat and then awards a grade. The best mark goes to the chair by the window, because the sun stays there for hours.",
          printLine: "Imaginary figures · just for fun",
          credit: "Photo: house archive",
          alt: "Placeholder — photo to follow.",
          stats: [
            { label: "Gaze", value: "72" },
            { label: "Sleep", value: "14 h" },
            { label: "Treats", value: "31" },
          ],
        },
      },
    },
    {
      id: "selten-02",
      number: "No. 03",
      rarity: "rare",
      serial: "ELSA · 0003 / 0005",
      stars: cardStars("rare"),
      photo: PHOTO,
      copy: {
        de: {
          name: "Geräusch-Archivarin",
          mood: "Wachsam",
          rarityLabel: "Selten",
          edition: "Erste Auflage · Serie I",
          keyword: "Geräusch",
          story:
            "Sie kennt jedes Geräusch im Haus und ordnet es einer Person zu. Der Kühlschrank bekommt eine eigene Rubrik, weil er sich zu jeder Nachtzeit meldet.",
          printLine: "Fantasiewerte · nur zum Spaß",
          credit: "Foto: Hausarchiv",
          alt: "Platzhalter — Foto folgt.",
          stats: [
            { label: "Blick", value: "84" },
            { label: "Schlaf", value: "11 h" },
            { label: "Leckerli", value: "27" },
          ],
        },
        en: {
          name: "Noise-Archivist",
          mood: "Alert",
          rarityLabel: "Rare",
          edition: "First edition · Series I",
          keyword: "Noise",
          story:
            "She knows every sound in the house and files it under a person. The fridge gets a section of its own, because it reports in at every hour of the night.",
          printLine: "Imaginary figures · just for fun",
          credit: "Photo: house archive",
          alt: "Placeholder — photo to follow.",
          stats: [
            { label: "Gaze", value: "84" },
            { label: "Sleep", value: "11 h" },
            { label: "Treats", value: "27" },
          ],
        },
      },
    },
    {
      id: "elsa-01",
      number: "No. 01",
      rarity: "holo",
      serial: "ELSA · 0001 / 0005",
      stars: cardStars("holo"),
      renderable: true,
      photo: PHOTO,
      copy: {
        de: {
          name: "Blickkontakt-Expertin",
          mood: "Aufmerksam",
          rarityLabel: "Holo-Pracht",
          edition: "Erste Auflage · Serie I",
          keyword: "Blickkontakt",
          story:
            "Sie sieht dich an, bis du dich einverstanden erklärst. Das Archiv nennt das Verfahren die Einverständniserklärung durch Aufmerksamkeit und führt es seit der ersten Auflage.",
          printLine: "Fantasiewerte · nur zum Spaß",
          credit: "Foto: Hausarchiv",
          alt: "Platzhalter — Foto folgt.",
          stats: [
            { label: "Blick", value: "98" },
            { label: "Schlaf", value: "12 h" },
            { label: "Leckerli", value: "24" },
          ],
        },
        en: {
          name: "Eye-Contact-Expert",
          mood: "Attentive",
          rarityLabel: "Holo glory",
          edition: "First edition · Series I",
          keyword: "Eye contact",
          story:
            "She looks at you until you agree. The archive calls the procedure consent by attention and has recorded it in every printing since the first edition.",
          printLine: "Imaginary figures · just for fun",
          credit: "Photo: house archive",
          alt: "Placeholder — photo to follow.",
          stats: [
            { label: "Gaze", value: "98" },
            { label: "Sleep", value: "12 h" },
            { label: "Treats", value: "24" },
          ],
        },
      },
    },
    {
      id: "langname-04",
      number: "No. 04",
      rarity: "rare",
      serial: "ELSA · 0004 / 0005",
      stars: cardStars("rare"),
      photo: PHOTO,
      copy: {
        de: {
          /** Exactly the 40-character budget (test-plan §5.8 U-CV-01). */
          name: "Blickkontakt-Expertin-der-Ersten-Auflage",
          mood: "Unbestechlich",
          rarityLabel: "Selten",
          edition: "Erste Auflage · Serie I",
          keyword: "Erste Auflage",
          story:
            "Ihr Name passt gerade so auf die Tafel und keinen Buchstaben weiter. Das Archiv hat ihn trotzdem behalten, weil er die Ausgabe und das Verfahren in einem Zug nennt.",
          printLine: "Fantasiewerte · nur zum Spaß",
          credit: "Foto: Hausarchiv",
          alt: "Platzhalter — Foto folgt.",
          stats: [
            { label: "Blick", value: "91" },
            { label: "Schlaf", value: "13 h" },
            { label: "Leckerli", value: "19" },
          ],
        },
        en: {
          name: "Eye-Contact-Expert-Of-The-First-Edition",
          mood: "Incorruptible",
          rarityLabel: "Rare",
          edition: "First edition · Series I",
          keyword: "First edition",
          story:
            "Her name just fits on the plate and not one letter further. The archive kept it anyway, because it names the printing and the procedure in one breath.",
          printLine: "Imaginary figures · just for fun",
          credit: "Photo: house archive",
          alt: "Placeholder — photo to follow.",
          stats: [
            { label: "Gaze", value: "91" },
            { label: "Sleep", value: "13 h" },
            { label: "Treats", value: "19" },
          ],
        },
      },
    },
    {
      id: "unbelichtet-05",
      number: "No. 05",
      rarity: "common",
      serial: "ELSA · 0005 / 0005",
      stars: cardStars("common"),
      renderable: false,
      photo: UNRENDERED_PHOTO,
      copy: {
        de: {
          name: "Unbelichtete Kandidatin",
          mood: "Noch nicht im Bild",
          rarityLabel: "Häufig",
          edition: "Erste Auflage · Serie I",
          keyword: "Vor der Kamera",
          story:
            "Für diese Karte liegt noch keine Aufnahme vor. Der Rahmen ist gedruckt, die Tafel gesetzt, und das Bild wartet auf den nächsten Termin im Hausarchiv.",
          printLine: "Fantasiewerte · nur zum Spaß",
          credit: "Foto: folgt",
          alt: "Noch kein Foto im Archiv — der Rahmen ist gedruckt.",
          stats: [
            { label: "Blick", value: "—" },
            { label: "Schlaf", value: "—" },
            { label: "Leckerli", value: "—" },
          ],
        },
        en: {
          name: "Unphotographed Candidate",
          mood: "Not yet in frame",
          rarityLabel: "Common",
          edition: "First edition · Series I",
          keyword: "Before the camera",
          story:
            "No picture exists for this card yet. The frame is printed, the plate is set, and the photograph is waiting for the next appointment at the house archive.",
          printLine: "Imaginary figures · just for fun",
          credit: "Photo: to follow",
          alt: "No photo in the archive yet — the frame is printed.",
          stats: [
            { label: "Gaze", value: "—" },
            { label: "Sleep", value: "—" },
            { label: "Treats", value: "—" },
          ],
        },
      },
    },
  ];

  function toModel(seed: Seed, locale: Locale): CardFaceModel {
    const copy = seed.copy[locale];
    return {
      id: seed.id,
      number: seed.number,
      name: copy.name,
      mood: copy.mood,
      rarity: seed.rarity,
      rarityLabel: copy.rarityLabel,
      stars: seed.stars,
      edition: copy.edition,
      keyword: copy.keyword,
      story: copy.story,
      printLine: copy.printLine,
      stats: copy.stats,
      serial: seed.serial,
      credit: copy.credit,
      renderable: seed.renderable ?? true,
      photo: {
        ...seed.photo,
        alt: copy.alt,
        focus: { x: 0.5, y: 0.42 },
      },
    };
  }

  const cards = $derived(SEEDS.map((seed) => toModel(seed, i18n.locale)));

  /**
   * `?lang=de|en` — the deep-link form E-JRN-13 already specifies. Read once at
   * start-up so the DE/EN clamp runs are two URLs, not two click paths.
   */
  const requested = new URLSearchParams(location.search).get("lang");
  if (isLocale(requested)) i18n.setLocale(requested);

  function toggleLocale(): void {
    const locale = i18n.toggle();
    const url = new URL(location.href);
    url.searchParams.set("lang", locale);
    history.replaceState(history.state, "", url);
  }
</script>

<main class="reading-room">
  <header class="masthead">
    <p class="eyebrow">Sammelwerk · Erste Auflage</p>
    <h1 class="wordmark">Elsa the Explorer</h1>
    <p class="tagline">Die Sammlung ist das Produkt. Elsa ist der Sammlungsmechanismus.</p>
  </header>

  <div class="slice-toolbar">
    <button class="locale-toggle" type="button" data-locale-toggle onclick={toggleLocale}>
      {i18n.locale === "de" ? "Deutsch · EN umschalten" : "English · switch to DE"}
    </button>
  </div>

  <section class="slice" aria-label="CardFace slice">
    {#each SLICE_WIDTHS as width (width)}
      <div class="slice-row" data-slice-width={width} style:--slice-cell={`${width}px`}>
        <p class="slice-label">
          {width} px{width === TILE_WIDTH ? " · Binder-Tile-Minimum" : ""}
        </p>
        <div class="slice-cards">
          {#each cards as card (card.id)}
            <div class="slice-cell" data-slice-card={card.id}>
              <CardFace model={card} />
            </div>
          {/each}
        </div>
      </div>
    {/each}
  </section>
</main>

<style>
  .reading-room {
    display: grid;
    /*
     * One `minmax(0, 1fr)` column: the track is the viewport width, so the
     * slice's flex rows wrap instead of widening the page. `place-content:
     * center` would size the track to the rows' max-content and overflow at
     * 320 px — the defect E-OVF-01 asserts against.
     */
    grid-template-columns: minmax(0, 1fr);
    align-content: start;
    justify-items: center;
    gap: var(--elsa-spacing-6);
    min-height: 100svh;
    min-width: 0;
    padding: var(--elsa-spacing-6);
    background-color: var(--elsa-colors-bg);
  }

  .masthead {
    display: grid;
    gap: var(--elsa-spacing-2);
    max-width: var(--elsa-sizes-content);
    text-align: center;
  }

  .eyebrow {
    color: var(--elsa-colors-metal);
    font-size: var(--elsa-font-sizes-sm);
    font-weight: var(--elsa-font-weights-semibold);
    letter-spacing: var(--elsa-letter-spacings-eyebrow);
    text-transform: uppercase;
  }

  .wordmark {
    color: var(--elsa-colors-ink);
    font-family: var(--elsa-fonts-print);
    font-size: var(--elsa-font-sizes-display);
    font-weight: var(--elsa-font-weights-regular);
    letter-spacing: var(--elsa-letter-spacings-display-tight);
    line-height: var(--elsa-line-heights-display);
  }

  .tagline {
    color: var(--elsa-colors-muted);
    font-size: var(--elsa-font-sizes-md);
  }

  .slice-toolbar {
    display: grid;
    justify-items: center;
    min-width: 0;
  }

  .locale-toggle {
    padding: var(--elsa-spacing-2) var(--elsa-spacing-4);
    border: var(--elsa-border-widths-hairline) solid var(--elsa-colors-line-strong);
    border-radius: var(--elsa-radii-pill);
    background: var(--elsa-colors-surface);
    color: var(--elsa-colors-ink);
    font-family: var(--elsa-fonts-body);
    font-size: var(--elsa-font-sizes-sm);
    letter-spacing: var(--elsa-letter-spacings-eyebrow);
    text-transform: uppercase;
  }

  .slice {
    display: grid;
    gap: var(--elsa-spacing-6);
    min-width: 0;
    width: 100%;
    max-width: var(--elsa-sizes-content);
  }

  .slice-row {
    display: grid;
    gap: var(--elsa-spacing-2);
    min-width: 0;
  }

  .slice-label {
    color: var(--elsa-colors-quiet);
    font-family: var(--elsa-fonts-body);
    font-size: var(--elsa-font-sizes-sm);
    letter-spacing: var(--elsa-letter-spacings-eyebrow);
    text-transform: uppercase;
  }

  .slice-cards {
    display: flex;
    flex-wrap: wrap;
    align-items: start;
    gap: var(--elsa-spacing-4);
    min-width: 0;
  }

  /*
   * The cell carries the width under test; it may never be wider than the
   * viewport, so a 340 px row at 320 px measures the shrink instead of
   * overflowing (E-OVF-01).
   */
  .slice-cell {
    width: min(100%, var(--slice-cell));
    min-width: 0;
  }
</style>
