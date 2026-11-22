<script lang="ts">
  import { onMount } from "svelte";
  import CardDialog from "$lib/components/CardDialog.svelte";
  import CardTile from "$lib/components/CardTile.svelte";
  import ResetConfirmDialog from "$lib/components/ResetConfirmDialog.svelte";
  import type { CardFaceModel } from "$lib/domain/card";
  import { cardStars } from "$lib/domain/card-stars";
  import {
    readPhotoParam,
    resolveDeepLink,
    withPhotoParam,
  } from "$lib/a11y/deep-link";
  import { focusReturn } from "$lib/a11y/focus.svelte";
  import { collection } from "$lib/stores/collection.svelte";
  import { i18n } from "$lib/stores/i18n.svelte";

  /**
   * B1/B3 fixture cards. The manifest → CardView pipeline arrives with the
   * catalogue phase; until then the binder renders four sample cards so the
   * tile contract (alt, state word, focus identity) is real and measurable.
   */
  const fixtures: readonly CardFaceModel[] = [
    {
      id: "elsa-01",
      number: "No. 01",
      name: "Blickkontakt-Expertin",
      mood: "Aufmerksam",
      rarity: "holo",
      rarityLabel: "Holo-Pracht",
      stars: cardStars("holo"),
      edition: "Erste Auflage · Serie I",
      keyword: "Blickkontakt",
      story:
        "Sie sieht dich an, bis du dich einverstanden erklärst. Das Archiv nennt das Verfahren „Einverständnis durch Aufmerksamkeit“.",
      printLine: "Fantasiewerte · nur zum Spaß",
      stats: [
        { label: "Blick", value: "98" },
        { label: "Schlaf", value: "12 h" },
        { label: "Leckerli", value: "24" },
      ],
      serial: "ELSA · 0001 / 0004",
      credit: "Foto: Hausarchiv",
      photo: {
        src: "/img/photo-unavailable.webp",
        alt: "Elsa schläft zusammengerollt auf einer grünen Decke.",
        width: 540,
        height: 720,
        focus: "center 42%",
      },
    },
    {
      id: "elsa-02",
      number: "No. 02",
      name: "Deckenhöhlen-Späherin",
      mood: "Verschlafen",
      rarity: "rare",
      rarityLabel: "Selten",
      stars: cardStars("rare"),
      edition: "Erste Auflage · Serie I",
      keyword: "Deckenhöhle",
      story:
        "Von innen ist die Decke ein Zelt. Von außen ist sie eine Decke. Sie hat für beides Verständnis.",
      printLine: "Fantasiewerte · nur zum Spaß",
      stats: [
        { label: "Tiefe", value: "3" },
        { label: "Schlaf", value: "14 h" },
        { label: "Leckerli", value: "9" },
      ],
      serial: "ELSA · 0002 / 0004",
      credit: "Foto: Hausarchiv",
      photo: {
        src: "/img/photo-unavailable.webp",
        alt: "Elsa blickt unter einer Decke hervor.",
        width: 540,
        height: 720,
        focus: "center 42%",
      },
    },
    {
      id: "elsa-03",
      number: "No. 03",
      name: "Fensterbank-Strategin",
      mood: "Beobachtend",
      rarity: "common",
      rarityLabel: "Häufig",
      stars: cardStars("common"),
      edition: "Erste Auflage · Serie I",
      keyword: "Ausblick",
      story:
        "Sie prüft die Straße auf Vorgänge, die ihrer Aufsicht bedürfen. Es sind viele.",
      printLine: "Fantasiewerte · nur zum Spaß",
      stats: [
        { label: "Blick", value: "87" },
        { label: "Geduld", value: "11" },
        { label: "Leckerli", value: "17" },
      ],
      serial: "ELSA · 0003 / 0004",
      credit: "Foto: Hausarchiv",
      photo: {
        src: "/img/photo-unavailable.webp",
        alt: "Elsa sitzt auf der Fensterbank und schaut hinaus.",
        width: 540,
        height: 720,
        focus: "center 42%",
      },
    },
    {
      id: "elsa-04",
      number: "No. 04",
      name: "Abfahrtsaal-Kundschafterin",
      mood: "Reisefertig",
      rarity: "rare",
      rarityLabel: "Selten",
      stars: cardStars("rare"),
      edition: "Erste Auflage · Serie I",
      keyword: "Abfahrt",
      story:
        "Sie erkennt ein Ziel am Geräusch des Motors. Der Abfahrtsaal ist ihr liebster Raum.",
      printLine: "Fantasiewerte · nur zum Spaß",
      stats: [
        { label: "Fahrt", value: "42" },
        { label: "Nase", value: "10" },
        { label: "Leckerli", value: "21" },
      ],
      serial: "ELSA · 0004 / 0004",
      credit: "Foto: Hausarchiv",
      photo: {
        src: "/img/photo-unavailable.webp",
        alt: "Elsa sitzt im Auto und legt die Nase an die Scheibe.",
        width: 540,
        height: 720,
        focus: "center 42%",
      },
    },
  ];

  let selectedId = $state<string | null>(null);
  const selected = $derived(fixtures.find((model) => model.id === selectedId) ?? null);

  onMount(() => {
    collection.setTotal(fixtures.length);
    const linked = resolveDeepLink(readPhotoParam(window.location.search), fixtures);
    if (!linked) return;
    // A deep link has no invoker: the ladder falls back to the CTA on close.
    focusReturn.capture("card", null);
    collection.markSeen(linked.id);
    selectedId = linked.id;
  });

  function activateCard(id: string, origin: HTMLElement): void {
    focusReturn.capture("card", origin);
    collection.markSeen(id);
    selectedId = id;
    history.pushState({ photo: id }, "", withPhotoParam(window.location.search, id));
  }

  function handleClosed(): void {
    selectedId = null;
    history.replaceState({}, "", withPhotoParam(window.location.search, null));
    // After the native close reset (ADR-0010 §3, E-FOC-15).
    queueMicrotask(() => focusReturn.restore("card"));
  }

  /** Back while a card is open is a route change: close and restore. */
  function handlePopState(): void {
    if (selectedId && readPhotoParam(window.location.search) === null) {
      selectedId = null;
    }
  }

  function enterCollection(): void {
    const firstTile = document.querySelector<HTMLElement>("#katalog [data-focus-id]");
    firstTile?.focus();
  }
</script>

<!--
  The two live regions (ADR-0010 §1): mounted once, empty at first paint,
  outside every conditional, clipped rather than hidden. `#live-status` is the
  only region with a writer; `#live-alert` ships empty on purpose.
-->
<div id="live-status" class="sr-only" role="status" aria-atomic="true"></div>
<div id="live-alert" class="sr-only" role="alert" aria-atomic="true"></div>

<main class="reading-room">
  <section class="stage" id="stage" tabindex="-1">
    <header class="masthead">
      <p class="eyebrow">Sammelwerk · Erste Auflage</p>
      <h1 class="wordmark">Elsa the Explorer</h1>
      <p class="tagline">{i18n.t("app.tagline")}</p>
    </header>
    <button
      class="stage__cta"
      id="open-pack"
      data-focus-id="open-pack"
      type="button"
      onclick={enterCollection}
    >
      {i18n.t("nav.catalogue")}
    </button>
    <div class="stage-tools">
      <ResetConfirmDialog />
    </div>
  </section>

  <section class="collection" id="katalog" aria-labelledby="collection-title">
    <div class="collection__head">
      <h2 class="collection__title" id="collection-title">{i18n.t("catalogue.title")}</h2>
      <p class="collection__lede">{i18n.t("catalogue.lede")}</p>
    </div>
    <ul class="collection__grid">
      {#each fixtures as model (model.id)}
        <li class="collection__item">
          <CardTile {model} collected={collection.has(model.id)} onactivate={activateCard} />
        </li>
      {/each}
    </ul>
  </section>

  <CardDialog model={selected} open={selectedId !== null} onclosed={handleClosed} />
</main>

<svelte:window on:popstate={handlePopState} />

<style>
  .sr-only {
    position: absolute;
    width: var(--elsa-border-widths-hairline);
    height: var(--elsa-border-widths-hairline);
    padding: 0;
    margin: 0;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
    border: 0;
  }

  .reading-room {
    display: grid;
    align-content: start;
    justify-items: center;
    gap: var(--elsa-spacing-6);
    min-height: 100svh;
    padding: var(--elsa-spacing-6);
    background-color: var(--elsa-colors-bg);
  }

  .masthead {
    display: grid;
    gap: var(--elsa-spacing-2);
    max-width: var(--elsa-sizes-content);
    text-align: center;
  }

  .stage {
    display: grid;
    justify-items: center;
    gap: var(--elsa-spacing-4);
    width: 100%;
    max-width: var(--elsa-sizes-content);
  }

  .stage__cta {
    min-height: var(--elsa-spacing-7);
    padding: var(--elsa-spacing-2) var(--elsa-spacing-4);
    border: var(--elsa-border-widths-hairline) solid var(--elsa-colors-line-strong);
    border-radius: var(--elsa-radii-pill);
    background: var(--elsa-colors-surface);
    color: var(--elsa-colors-ink);
    font-size: var(--elsa-font-sizes-md);
    font-weight: var(--elsa-font-weights-semibold);
  }

  .stage__cta:hover {
    background: var(--elsa-colors-surface-light);
  }

  .eyebrow {
    color: var(--elsa-colors-metal);
    /* Tracked uppercase matches Chivo's caps advance, not its sentence copy:
       `fonts.label` carries the label-specific interim face (#81). */
    font-family: var(--elsa-fonts-label);
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

  .stage-tools {
    display: grid;
    justify-items: center;
  }

  .collection {
    display: grid;
    gap: var(--elsa-spacing-4);
    width: 100%;
    max-width: var(--elsa-sizes-content);
  }

  .collection__head {
    display: grid;
    gap: var(--elsa-spacing-2);
  }

  .collection__title {
    color: var(--elsa-colors-ink);
    font-family: var(--elsa-fonts-print);
    font-size: var(--elsa-font-sizes-xl);
    font-weight: var(--elsa-font-weights-regular);
    letter-spacing: var(--elsa-letter-spacings-display);
  }

  .collection__lede {
    color: var(--elsa-colors-muted);
    font-size: var(--elsa-font-sizes-md);
    max-width: var(--elsa-sizes-content);
  }

  .collection__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(var(--elsa-sizes-card-min), 1fr));
    gap: var(--elsa-spacing-3);
  }

  .collection__item {
    display: block;
    min-width: 0;
  }
</style>
