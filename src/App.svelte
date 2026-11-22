<script lang="ts">
  import CardFace from "$lib/components/CardFace.svelte";
  import type { CardFaceModel } from "$lib/domain/card";

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
    stars: 3,
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
      alt: "Elsa blickt aufmerksam in die Kamera.",
      width: 540,
      height: 720,
      focus: "center 42%",
    },
  };
</script>

<main class="reading-room">
  <header class="masthead">
    <p class="eyebrow">Sammelwerk · Erste Auflage</p>
    <h1 class="wordmark">Elsa the Explorer</h1>
    <p class="tagline">Die Sammlung ist das Produkt. Elsa ist der Sammlungsmechanismus.</p>
  </header>

  <CardFace model={sample} />
</main>

<style>
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
</style>
