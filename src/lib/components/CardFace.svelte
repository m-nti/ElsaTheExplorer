<script lang="ts">
  import type { CardFaceModel } from "$lib/domain/card";
  import { plateRows } from "$lib/domain/card-plate";
  import { STAR_SCALE_MAX, starLabel } from "$lib/domain/card-stars";
  import { focusToObjectPosition } from "$lib/domain/card-photo";
  import { renderMode } from "$lib/domain/render-mode";
  import { ZERO_TILT, tiltForPointer, type TiltTarget } from "$lib/domain/tilt";
  import { motion } from "$lib/a11y/motion.svelte";
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
  /** `renderable:false` prints the frame and requests no image (#13, T8). */
  const mode = $derived(renderMode(model));
  /** Spoken against the fixed scale in the page's language — never a literal. */
  const starsLabel = $derived(starLabel(model.stars, i18n.locale));
  /** The row is always `STAR_SCALE_MAX` slots; the filled ones lead. */
  const starSlots = $derived(
    Array.from({ length: STAR_SCALE_MAX }, (_, index) => index < model.stars),
  );

  /**
   * Tilt (card-detail §5.3 A, §10): the face leans toward the pointer; the
   * motion store decides whether it may, never a direct OS query. Reduced
   * motion returns the rest frame from the domain, so there is no second code
   * path.
   */
  let pointerTilt = $state<TiltTarget>(ZERO_TILT);
  const tilt = $derived(motion.reduce ? ZERO_TILT : pointerTilt);

  function handlePointerMove(event: PointerEvent): void {
    if (motion.reduce) return;
    const bounds = event.currentTarget instanceof HTMLElement
      ? event.currentTarget.getBoundingClientRect()
      : null;
    if (!bounds || bounds.width === 0 || bounds.height === 0) return;
    pointerTilt = tiltForPointer(
      (event.clientX - bounds.left) / bounds.width,
      (event.clientY - bounds.top) / bounds.height,
      false,
    );
  }

  /** Pointer leaves, focus leaves, or the gesture is cancelled: back to rest. */
  function restTilt(): void {
    pointerTilt = ZERO_TILT;
  }
</script>

<div class="card-shell">
  <article
    class="card-face {rarityClass}"
    data-rarity={model.rarity}
    data-render={mode}
    aria-labelledby={titleId}
    style:--elsa-tilt-x={`${tilt.x}deg`}
    style:--elsa-tilt-y={`${tilt.y}deg`}
    onpointermove={handlePointerMove}
    onpointerleave={restTilt}
    onpointercancel={restTilt}
    onfocusout={restTilt}
  >
    <div class="plate">
    <header class="zone header">
      <h2 class="name" id={titleId}>{rows.name}</h2>
      <div class="plate-meta">
        <span class="number">{rows.meta[0]}</span>
        <span class="mood">{rows.meta[1]}</span>
        <span class="chip">
          <span class="chip-label">{rows.meta[2]}</span>
          <span class="foil-chip" aria-hidden="true"></span>
        </span>
      </div>
    </header>

    <div class="zone photo-zone">
      <figure class="window">
        {#if mode === "printed"}
          <!--
            Printed frame (renderable:false): the archive holds no photograph.
            No image element, no CSS image reference, no request - E-IMG-09.
            The crest is decoration; the caption is the photo alt, so the band
            still has a text carrier.
          -->
          <span class="printed-plate" aria-hidden="true">
            <span class="printed-mark"><span class="printed-mark-text">ELSA</span></span>
          </span>
          <figcaption class="printed-caption">
            <span class="printed-caption-text">{model.photo.alt}</span>
          </figcaption>
        {:else}
          <img
            class="photo"
            src={model.photo.src}
            alt={model.photo.alt}
            width={model.photo.width}
            height={model.photo.height}
            loading="eager"
            fetchpriority="high"
            style:object-position={focusToObjectPosition(model.photo.focus)}
            decoding="async"
          />
          <span class="foil-photo" aria-hidden="true"></span>
        {/if}
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

      <span class="foil-rim" aria-hidden="true"></span>
      <span class="foil-etch" aria-hidden="true"></span>
      <span class="foil-glitter" aria-hidden="true">
        <span class="rays" aria-hidden="true"></span>
        <span class="glint" aria-hidden="true"></span>
      </span>
    </div>
  </article>
</div>

<style>
  /*
   * CardFace — the seven-bay card. This is the surface register's "CardFace
   * foil stack" entry: every value below is a named token or a recipe-emitted
   * `--tier-*` variable. No literal colour, length or opacity.
   *
   * One root em scale (#89, art-bible §8). `.card-face` is the em root
   * (`4cqw` of its container), and **every** card-internal length consumes the
   * `card-*` em family: spacing, type, radii, border widths, the shadow. Band
   * percentages are already scale-free; em is what makes the *content* inside
   * them scale too. The one deliberate exception is
   * `--elsa-tilt-perspective` — the 3D stage depth the motion sheet pins as a
   * constant — plus the card's own width, which is the em root's input.
   *
   * Two rules follow from em and are load-bearing:
   * 1. A box's `em` resolves against **its own** font-size, so no element that
   *    carries padding, a border or a gap may also set `font-size`. Text nodes
   *    own the type (`.chip-label`, `.edition`, `.serial`, `.star`, …); their
   *    boxes stay at the root step. This is why the chip and the printed
   *    caption have a label span.
   * 2. A box that *contains* text it did not size needs `line-height: 0` so the
   *    inherited strut cannot outgrow the label (`.chip`, `.printed-caption`).
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
    padding: var(--elsa-card-space-2);
    border-radius: var(--elsa-card-radius);
    background: var(--elsa-gradients-foil-pearl);
    box-shadow: var(--elsa-card-shadow);
    color: var(--elsa-colors-ink);
    font-family: var(--elsa-fonts-body);
    font-size: var(--elsa-sizes-card-root);
    line-height: var(--elsa-line-heights-card);
    /* Tilt: the two local variables the pointer handler writes. */
    transform:
      perspective(var(--elsa-tilt-perspective))
      rotateX(var(--elsa-tilt-x))
      rotateY(var(--elsa-tilt-y));
    transition: transform var(--elsa-dur-settle) var(--elsa-ease-soft);
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
    /*
     * The seventh bay: 4.5 % of the plate, distributed as the five gaps between
     * the six content bands — 0.9 % each, 4.23 px at the 340 px reference
     * (art-bible §8, `tokens.ts` `zone-gutters`). Without it the rows sum to
     * 95.5 % and the foot floats above the plate's bottom edge.
     */
    row-gap: calc(var(--elsa-sizes-zone-gutters) / 5);
    position: relative;
    overflow: hidden;
    height: 100%;
    border-radius: calc(var(--elsa-card-radius) - var(--elsa-card-space-1));
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
    gap: var(--elsa-card-space-1);
    padding: var(--elsa-card-space-2);
    border-bottom: var(--elsa-card-rule) solid var(--elsa-colors-line);
    background: var(--elsa-gradients-plate-header);
  }

  .plate-meta {
    display: flex;
    align-items: center;
    gap: var(--elsa-card-space-2);
    min-width: 0;
  }

  /*
   * One type step for every small line on the card — the number, the mood, the
   * chip, the stars, the label, the stat keys and the foot. Declared once: it
   * is one value from the em scale, and eleven copies of it was the sort of
   * drift the scale exists to end. The boxes these sit in stay at the root
   * font-size, because `em` padding resolves against the element's own type.
   */
  .chip-label,
  .credit,
  .edition,
  .mood,
  .number,
  .print-line,
  .printed-caption-text,
  .printed-mark-text,
  .serial,
  .star,
  .stat-key {
    font-size: var(--elsa-card-text-sm);
  }

  .number {
    flex: none;
    color: var(--elsa-colors-print-number);
    font-weight: var(--elsa-font-weights-semibold);
    letter-spacing: var(--elsa-letter-spacings-eyebrow);
    text-transform: uppercase;
  }

  .chip {
    position: relative;
    isolation: isolate;
    overflow: hidden;
    flex: none;
    padding: var(--elsa-card-space-1) var(--elsa-card-space-2);
    border: var(--elsa-card-rule) solid var(--tier-chip-border);
    border-radius: var(--elsa-card-radius-pill);
    background: var(--tier-chip-background);
    color: var(--tier-chip-color);
    /* The label owns the type; the box must not outgrow it (rule 2 above). */
    line-height: 0;
  }

  .chip-label {
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
    font-size: var(--elsa-card-text-xl);
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
    border-radius: var(--elsa-card-radius-photo);
    background: var(--elsa-colors-surface);
    box-shadow: inset 0 0 0 var(--elsa-card-rule) var(--elsa-colors-line);
  }

  .photo {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  /*
   * The printed frame (renderable:false): a blind-embossed plate with the
   * archive crest, and the photo's own alt as its caption. Nothing here can
   * fire a request — no image reference in this stylesheet (E-IMG-09).
   */
  .printed-plate {
    display: grid;
    place-items: center;
    width: 100%;
    height: 100%;
    padding: var(--elsa-card-space-3);
    background: var(--elsa-gradients-plate-header);
  }

  .printed-mark {
    display: grid;
    place-items: center;
    width: var(--elsa-card-space-6);
    height: var(--elsa-card-space-6);
    border: var(--elsa-card-rule) solid var(--elsa-colors-line-strong);
    border-radius: var(--elsa-card-radius-pill);
    color: var(--elsa-colors-metal);
    font-family: var(--elsa-fonts-print);
  }

  .printed-mark-text {
    letter-spacing: var(--elsa-letter-spacings-eyebrow);
  }

  .printed-caption {
    position: absolute;
    inset-inline: 0;
    bottom: 0;
    padding: var(--elsa-card-space-2);
    color: var(--elsa-colors-print-credit);
    line-height: 0;
    text-align: center;
  }

  .printed-caption-text {
    line-height: var(--elsa-line-heights-card);
  }

  .foil-photo {
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
    gap: var(--elsa-card-space-2);
    padding-inline: var(--elsa-card-space-2);
    border-bottom: var(--elsa-card-rule) solid var(--elsa-colors-line-strong);
    color: var(--elsa-colors-print-line);
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
    gap: var(--elsa-card-space-1);
    line-height: var(--elsa-line-heights-display);
  }

  /* Five slots on every card: the empty ones are the comparison. */
  .star-filled {
    color: var(--tier-star-color);
  }

  .star-empty {
    color: var(--elsa-colors-star-empty);
  }

  /*
   * Band 4's D70 two-row plan (#70): the sentence (≤ 3 lines, ellipsised past
   * the third) and the Fantasiewerte line as its last row — immediately above
   * band 5's chips, so the disclaimer precedes the values in reading order and
   * in the accessible name. 16 padding + 4 gap + 3 × 17.55 + 14.85 = 87.50 px
   * of a 91.59 px band at the 340 px reference: 4.09 px of slack, and the
   * keyword row that used to eat it is retired from the plate.
   */
  .story {
    display: grid;
    grid-template-rows: minmax(0, 1fr) auto;
    gap: var(--elsa-card-space-1);
    padding: var(--elsa-card-space-2);
  }

  .copy {
    display: -webkit-box;
    overflow: hidden;
    color: var(--elsa-colors-print-copy);
    font-size: var(--elsa-card-text-md);
    -webkit-box-orient: vertical;
    line-clamp: 3;
    -webkit-line-clamp: 3;
  }

  .print-line {
    overflow: hidden;
    color: var(--elsa-colors-print-line);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .stats {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--elsa-card-space-1);
    padding-inline: var(--elsa-card-space-2);
  }

  .stat {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 0;
    padding: var(--elsa-card-space-1);
    border: var(--elsa-card-rule) solid var(--elsa-colors-line);
    border-radius: var(--elsa-card-radius-inner);
    background: var(--elsa-gradients-foil-rise);
  }

  .stat-key {
    overflow: hidden;
    color: var(--elsa-colors-print-stat-key);
    line-height: var(--elsa-line-heights-display);
    letter-spacing: var(--elsa-letter-spacings-eyebrow);
    text-overflow: ellipsis;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .stat-value {
    color: var(--elsa-colors-print-stat-value);
    font-size: var(--elsa-card-text-md);
    line-height: var(--elsa-line-heights-display);
    font-weight: var(--elsa-font-weights-bold);
  }

  .foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--elsa-card-space-2);
    padding-inline: var(--elsa-card-space-2);
    border-top: var(--elsa-card-rule) solid var(--elsa-colors-line);
    color: var(--elsa-colors-print-serial);
  }

  .serial {
    white-space: nowrap;
  }

  .credit {
    overflow: hidden;
    color: var(--elsa-colors-print-credit);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .foil-rim,
  .foil-etch,
  .foil-glitter,
  .glint,
  .rays {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    pointer-events: none;
  }

  .foil-rim {
    z-index: 2;
    padding: var(--elsa-card-space-1);
    background: var(--elsa-gradients-foil-pearl);
    mask:
      linear-gradient(var(--elsa-colors-mask) 0 0) content-box,
      linear-gradient(var(--elsa-colors-mask) 0 0);
    mask-composite: exclude;
    mix-blend-mode: screen;
    opacity: var(--tier-ring-opacity);
  }

  .foil-glitter {
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

  /* Chip foil: the rarity chip is the second non-colour backup, so it gets
     its own sheen rather than riding the rim. Scoped to the chip — art-bible
     §8 foil rule 1 sanctions foil on the chip, and rule 6 forbids it over the
     plate text, so this is not a wash across the card. */
  .foil-chip {
    position: absolute;
    inset: 0;
    z-index: -1;
    border-radius: inherit;
    background: var(--elsa-gradients-foil-pearl);
    mix-blend-mode: screen;
    opacity: var(--tier-glow-opacity);
    pointer-events: none;
  }

  /* Etch: the fine line work over the photo and copy, never over the plate
     text — the mask starts below the plate band (15.5 %). */
  .foil-etch {
    z-index: 5;
    background-image: var(--elsa-gradients-foil-pastel);
    mask-image: linear-gradient(
      to bottom,
      transparent 0 var(--elsa-sizes-zone-header),
      var(--elsa-colors-mask) var(--elsa-sizes-zone-header)
    );
    mix-blend-mode: soft-light;
    opacity: var(--tier-etch-opacity);
  }

  .glint {
    z-index: 4;
    background-image: var(--elsa-gradients-glint);
    mix-blend-mode: screen;
    opacity: var(--tier-glint-opacity);
    animation: glint var(--tier-glint-duration) var(--elsa-ease-soft) infinite;
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
    /*
     * The final frame, declared rather than hoped for: the card sits square and
     * switches instantly, so no movement can carry information. The zero also
     * arrives from `tiltFor`/`motion.reduce` in JS; this is the CSS belt the
     * ADR keeps as a second reader of the same OS fact.
     */
    .card-face {
      transform: none;
      transition: none;
    }

    /*
     * Freeze, do not delete. The sweep is the only autonomous motion in this
     * slice; art-bible §8 rule 5 asks for static foil at opacity ≤ 0.3, so the
     * static layers keep their tier opacity and only the glint stops. The old
     * `.glitter` selector was dead after the five-layer rename.
     */
    .glint {
      animation: none;
      opacity: 0;
    }
  }
</style>
