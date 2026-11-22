<script lang="ts">
  import type { CardFaceModel } from "$lib/domain/card";
  import { plateRows } from "$lib/domain/card-plate";
  import { STAR_SCALE_MAX, starLabel } from "$lib/domain/card-stars";
  import { focusToObjectPosition } from "$lib/domain/card-photo";
  import { i18n } from "$lib/stores/i18n.svelte";
  import { rarity as rarityRecipe } from "styled-system/recipes/rarity";

  interface Props {
    model: CardFaceModel;
  }

  let { model }: Props = $props();

  const rarityClass = $derived(rarityRecipe({ rarity: model.rarity }));
  const titleId = $derived(`card-title-${model.id}`);
  /** The plate's two rows (art-bible §8): name first, metadata second. */
  const rows = $derived(plateRows(model));
  /** Spoken against the fixed scale in the page's language — never a literal. */
  const starsLabel = $derived(starLabel(model.stars, i18n.locale));
  /** The row is always `STAR_SCALE_MAX` slots; the filled ones lead. */
  const starSlots = $derived(
    Array.from({ length: STAR_SCALE_MAX }, (_, index) => index < model.stars),
  );
</script>

<div class="card-shell">
  <article class="card-face {rarityClass}" data-rarity={model.rarity} aria-labelledby={titleId}>
    <div class="plate">
    <header class="zone header">
      <h2 class="name" id={titleId}>{rows.name}</h2>
      <div class="plate-meta">
        <span class="number">{rows.meta[0]}</span>
        <span class="mood">{rows.meta[1]}</span>
        <span class="chip">{rows.meta[2]}</span>
      </div>
    </header>

    <div class="zone photo-zone">
      <figure class="window">
        <img
          class="photo"
          src={model.photo.src}
          alt={model.photo.alt}
          width={model.photo.width}
          height={model.photo.height}
          style:object-position={focusToObjectPosition(model.photo.focus)}
          decoding="async"
        />
        <span class="photo-foil" aria-hidden="true"></span>
      </figure>
    </div>

    <div class="zone strip">
      <span class="edition">{model.edition}</span>
      <span class="stars" role="img" aria-label={starsLabel}>
        {#each starSlots as filled, index (index)}
          <span class={filled ? "star star-filled" : "star star-empty"} aria-hidden="true">★</span>
        {/each}
      </span>
    </div>

    <div class="zone story">
      <p class="keyword">{model.keyword}</p>
      <p class="copy">{model.story}</p>
      <p class="print-line">{model.printLine}</p>
    </div>

    <div class="zone stats">
      {#each model.stats as stat (stat.label)}
        <div class="stat">
          <span class="stat-key">{stat.label}</span>
          <span class="stat-value">{stat.value}</span>
        </div>
      {/each}
    </div>

    <footer class="zone foot">
      <span class="serial">{model.serial}</span>
      <span class="credit">{model.credit}</span>
    </footer>

      <span class="foil" aria-hidden="true"></span>
      <span class="glitter" aria-hidden="true"></span>
      <span class="glint" aria-hidden="true"></span>
    </div>
  </article>
</div>

<style>
  /*
   * CardFace — B1 anatomy only. This is the surface register's "CardFace foil
   * stack" entry: every value below is a named token or a recipe-emitted
   * `--tier-*` variable. No literal colour, length or opacity.
   */
  /*
   * The shell owns the container and the card silhouette. The face is the em
   * root (art-bible §8): `4cqw` must resolve against an ANCESTOR container,
   * so putting `container-type` on the face itself would resolve `cqw` against
   * the viewport instead of the plate.
   */
  .card-shell {
    container-type: inline-size;
    width: min(100%, var(--elsa-sizes-card-max));
    aspect-ratio: var(--elsa-aspect-ratios-card);
  }

  .card-face {
    position: relative;
    isolation: isolate;
    width: 100%;
    height: 100%;
    padding: var(--elsa-spacing-2);
    border-radius: var(--elsa-radii-card);
    background: var(--elsa-gradients-foil-pearl);
    box-shadow: var(--elsa-shadows-card);
    color: var(--elsa-colors-ink);
    font-family: var(--elsa-fonts-body);
    font-size: var(--elsa-sizes-card-root);
    line-height: var(--elsa-line-heights-card);
  }

  .card-face::after {
    content: "";
    position: absolute;
    inset: 0;
    z-index: -1;
    border-radius: inherit;
    box-shadow: 0 0 var(--tier-glow-size) var(--elsa-colors-accent);
    opacity: var(--tier-glow-opacity);
    pointer-events: none;
  }

  .plate {
    display: grid;
    grid-template-rows:
      var(--elsa-sizes-zone-header)
      var(--elsa-sizes-zone-photo)
      var(--elsa-sizes-zone-strip)
      var(--elsa-sizes-zone-story)
      var(--elsa-sizes-zone-stats)
      var(--elsa-sizes-zone-foot);
    position: relative;
    overflow: hidden;
    height: 100%;
    border-radius: calc(var(--elsa-radii-card) - var(--elsa-spacing-1));
    background: var(--elsa-gradients-plate-body);
  }

  .zone {
    position: relative;
    z-index: 1;
    min-height: 0;
    overflow: hidden;
  }

  .header {
    display: grid;
    grid-template-rows: auto auto;
    align-content: center;
    gap: var(--elsa-spacing-1);
    padding: var(--elsa-spacing-2);
    border-bottom: var(--elsa-border-widths-hairline) solid var(--elsa-colors-line);
    background: var(--elsa-gradients-plate-header);
  }

  .plate-meta {
    display: flex;
    align-items: center;
    gap: var(--elsa-spacing-2);
    min-width: 0;
  }

  .number {
    flex: none;
    color: var(--elsa-colors-print-number);
    font-size: var(--elsa-font-sizes-sm);
    font-weight: var(--elsa-font-weights-semibold);
    letter-spacing: var(--elsa-letter-spacings-eyebrow);
    text-transform: uppercase;
  }

  .chip {
    flex: none;
    padding: var(--elsa-spacing-1) var(--elsa-spacing-2);
    border: var(--elsa-border-widths-hairline) solid var(--tier-chip-border);
    border-radius: var(--elsa-radii-pill);
    background: var(--tier-chip-background);
    color: var(--tier-chip-color);
    font-size: var(--elsa-font-sizes-sm);
    font-weight: var(--elsa-font-weights-bold);
    letter-spacing: var(--elsa-letter-spacings-eyebrow);
    line-height: var(--elsa-line-heights-display);
    text-transform: uppercase;
  }

  .name {
    overflow: hidden;
    color: var(--tier-name-color);
    background-image: var(--tier-name-image);
    background-clip: text;
    filter: var(--tier-name-shadow);
    font-size: var(--elsa-font-sizes-xl);
    font-weight: var(--elsa-font-weights-bold);
    letter-spacing: var(--elsa-letter-spacings-display);
    line-height: var(--elsa-line-heights-card);
    text-overflow: ellipsis;
    white-space: nowrap;
    -webkit-text-fill-color: var(--tier-name-fill);
  }

  .mood {
    flex: 1;
    overflow: hidden;
    min-width: 0;
    color: var(--elsa-colors-print-mood);
    font-size: var(--elsa-font-sizes-sm);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .photo-zone {
    display: grid;
    place-items: center;
  }

  .window {
    position: relative;
    overflow: hidden;
    height: 100%;
    aspect-ratio: var(--elsa-aspect-ratios-window);
    border-radius: var(--elsa-radii-photo);
    background: var(--elsa-colors-surface);
    box-shadow: inset 0 0 0 var(--elsa-border-widths-hairline) var(--elsa-colors-line);
  }

  .photo {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .photo-foil {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: var(--elsa-gradients-foil-spectrum);
    mix-blend-mode: hard-light;
    opacity: var(--tier-photo-foil);
    pointer-events: none;
  }

  .strip {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--elsa-spacing-2);
    padding-inline: var(--elsa-spacing-2);
    border-bottom: var(--elsa-border-widths-hairline) solid var(--elsa-colors-line-strong);
    color: var(--elsa-colors-print-line);
    font-size: var(--elsa-font-sizes-sm);
  }

  .edition {
    overflow: hidden;
    letter-spacing: var(--elsa-letter-spacings-eyebrow);
    text-overflow: ellipsis;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .stars {
    display: flex;
    gap: var(--elsa-spacing-1);
    line-height: var(--elsa-line-heights-display);
  }

  /* Five slots on every card: the empty ones are the comparison. */
  .star {
    line-height: inherit;
  }

  .star-filled {
    color: var(--tier-star-color);
  }

  .star-empty {
    color: var(--elsa-colors-star-empty);
  }

  .story {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr) auto;
    gap: var(--elsa-spacing-1);
    padding: var(--elsa-spacing-2);
  }

  .keyword {
    overflow: hidden;
    color: var(--elsa-colors-print-keyword);
    font-size: var(--elsa-font-sizes-sm);
    font-weight: var(--elsa-font-weights-semibold);
    letter-spacing: var(--elsa-letter-spacings-eyebrow);
    text-overflow: ellipsis;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .copy {
    display: -webkit-box;
    overflow: hidden;
    color: var(--elsa-colors-print-copy);
    font-size: var(--elsa-font-sizes-md);
    -webkit-box-orient: vertical;
    line-clamp: 1;
    -webkit-line-clamp: 1;
  }

  .print-line {
    overflow: hidden;
    color: var(--elsa-colors-print-line);
    font-size: var(--elsa-font-sizes-sm);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .stats {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--elsa-spacing-1);
    padding-inline: var(--elsa-spacing-2);
  }

  .stat {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 0;
    padding: var(--elsa-spacing-1);
    border: var(--elsa-border-widths-hairline) solid var(--elsa-colors-line);
    border-radius: var(--elsa-radii-sm);
    background: var(--elsa-gradients-foil-rise);
  }

  .stat-key {
    overflow: hidden;
    color: var(--elsa-colors-print-stat-key);
    font-size: var(--elsa-font-sizes-sm);
    line-height: var(--elsa-line-heights-display);
    letter-spacing: var(--elsa-letter-spacings-eyebrow);
    text-overflow: ellipsis;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .stat-value {
    color: var(--elsa-colors-print-stat-value);
    font-size: var(--elsa-font-sizes-md);
    line-height: var(--elsa-line-heights-display);
    font-weight: var(--elsa-font-weights-bold);
  }

  .foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--elsa-spacing-2);
    padding-inline: var(--elsa-spacing-2);
    border-top: var(--elsa-border-widths-hairline) solid var(--elsa-colors-line);
    color: var(--elsa-colors-print-serial);
    font-size: var(--elsa-font-sizes-sm);
  }

  .credit {
    overflow: hidden;
    color: var(--elsa-colors-print-credit);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .foil,
  .glitter,
  .glint {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    pointer-events: none;
  }

  .foil {
    z-index: 2;
    padding: var(--elsa-spacing-1);
    background: var(--elsa-gradients-foil-pearl);
    mask:
      linear-gradient(var(--elsa-colors-mask) 0 0) content-box,
      linear-gradient(var(--elsa-colors-mask) 0 0);
    mask-composite: exclude;
    mix-blend-mode: screen;
    opacity: var(--tier-ring-opacity);
  }

  .glitter {
    z-index: 3;
    background-image: var(--elsa-gradients-foil-pastel);
    background-size: var(--elsa-sizes-glitter-size);
    mask-image: radial-gradient(
      circle at var(--elsa-sizes-photo-focus-x) var(--elsa-sizes-photo-focus-y),
      var(--elsa-colors-mask),
      transparent var(--elsa-sizes-glitter-mask-stop)
    );
    mix-blend-mode: soft-light;
    opacity: var(--tier-glitter-opacity);
  }

  .glint {
    z-index: 4;
    background-image: var(--elsa-gradients-glint);
    mix-blend-mode: screen;
    opacity: var(--tier-glint-opacity);
    animation: glint var(--tier-glint-duration) var(--elsa-ease-soft) infinite;
  }

  @container (max-width: 300px) {
    .header {
      gap: 0;
      padding: var(--elsa-spacing-1);
    }

    .name {
      font-size: var(--elsa-font-sizes-lg);
    }
  }

  @keyframes glint {
    from {
      transform: translate3d(var(--elsa-sizes-glint-from), 0, 0);
    }

    to {
      transform: translate3d(var(--elsa-sizes-glint-to), 0, 0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .glint {
      animation: none;
      opacity: 0;
    }

    .glitter,
    .photo-foil {
      opacity: 0;
    }
  }
</style>
