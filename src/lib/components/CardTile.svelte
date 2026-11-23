<script lang="ts">
  import type { CardFaceModel } from "$lib/domain/card";
  import { tileAlt, tileNumberLabel } from "$lib/domain/tile";
  import { focusToObjectPosition } from "$lib/domain/card-photo";
  import { i18n } from "$lib/stores/i18n.svelte";

  interface Props {
    model: CardFaceModel;
    collected: boolean;
    /** Called with the tile's own element so the opener can be restored on close. */
    onactivate: (id: string, origin: HTMLElement) => void;
  }

  let { model, collected, onactivate }: Props = $props();

  /** Copy-deck `tile.aria.open*`: the name and the state are both spoken. */
  const label = $derived(
    i18n.format(collected ? "tile.aria.open" : "tile.aria.open.unseen", {
      number: tileNumberLabel(model.number),
      name: model.name,
    }),
  );
  const state = $derived(
    i18n.t(collected ? "tile.state.collected" : "tile.state.unseen"),
  );
  /** a11y-baseline M6: the photograph is described, not the fictional name alone. */
  const alt = $derived(
    tileAlt(model.photo, i18n.format("card.image.alt", { name: model.name })),
  );
</script>

<button
  type="button"
  class="tile"
  data-focus-id={model.id}
  aria-label={label}
  onclick={(event) => onactivate(model.id, event.currentTarget)}
>
  <span class="tile__window">
    <img
      class="tile__photo"
      src={model.photo.src}
      {alt}
      width={model.photo.width}
      height={model.photo.height}
      style:object-position={focusToObjectPosition(model.photo.focus)}
      loading="lazy"
      decoding="async"
    />
  </span>
  <span class="tile__name">{model.name}</span>
  <span class="tile__state">{state}</span>
</button>

<style>
  .tile {
    display: grid;
    gap: var(--elsa-spacing-1);
    width: 100%;
    padding: var(--elsa-spacing-2);
    border: var(--elsa-border-widths-hairline) solid var(--elsa-colors-line);
    border-radius: var(--elsa-radii-md);
    background: var(--elsa-colors-surface);
    color: var(--elsa-colors-ink);
    font-family: var(--elsa-fonts-body);
    text-align: left;
  }

  .tile:hover {
    background: var(--elsa-colors-surface-light);
    border-color: var(--elsa-colors-line-strong);
  }

  .tile__window {
    display: block;
    overflow: hidden;
    width: 100%;
    aspect-ratio: var(--elsa-aspect-ratios-window);
    border-radius: var(--elsa-radii-sm);
    background: var(--elsa-colors-bg-raised);
  }

  .tile__photo {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .tile__name {
    overflow: hidden;
    font-size: var(--elsa-font-sizes-lg);
    font-weight: var(--elsa-font-weights-semibold);
    line-height: var(--elsa-line-heights-ui);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .tile__state {
    color: var(--elsa-colors-muted);
    font-size: var(--elsa-font-sizes-sm);
  }
</style>
