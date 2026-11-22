<script lang="ts">
  import CardFace from "$lib/components/CardFace.svelte";
  import ResetConfirmDialog from "$lib/components/ResetConfirmDialog.svelte";
  import type { CardFaceModel } from "$lib/domain/card";
  import { cardStars } from "$lib/domain/card-stars";

  /**
   * B1 fixture only. The manifest → CardView pipeline arrives in B2/B3; until
   * then the shell renders exactly one sample card so the token system and the
   * component-scoped foil stack are visible and measurable.
   */
  const sample: CardFaceModel = {
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
    serial: "ELSA · 0001 / 0001",
    credit: "Foto: Hausarchiv",
    photo: {
      src: "/img/photo-unavailable.webp",
      alt: "Platzhalter — Foto folgt.",
      width: 540,
      height: 720,
      focus: "center 42%",
    },
  };
</script>

<!--
  The two live regions (ADR-0010 §1): mounted once, empty at first paint,
  outside every conditional, clipped rather than hidden. `#live-status` is the
  only region with a writer; `#live-alert` ships empty on purpose.
-->
<div id="live-status" class="sr-only" role="status" aria-atomic="true"></div>
<div id="live-alert" class="sr-only" role="alert" aria-atomic="true"></div>

<main id="stage" tabindex="-1" class="reading-room">
  <header class="masthead">
    <p class="eyebrow">Sammelwerk · Erste Auflage</p>
    <h1 class="wordmark">Elsa the Explorer</h1>
    <p class="tagline">Die Sammlung ist das Produkt. Elsa ist der Sammlungsmechanismus.</p>
  </header>

  <div class="stage-tools">
    <ResetConfirmDialog />
  </div>

  <CardFace model={sample} />
</main>

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
    place-content: center;
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

  .stage-tools {
    display: grid;
    justify-items: center;
  }
</style>
