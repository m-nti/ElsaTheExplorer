<script lang="ts">
  import CardFace from "$lib/components/CardFace.svelte";
  import type { CardFaceModel } from "$lib/domain/card";
  import { i18n } from "$lib/stores/i18n.svelte";

  interface Props {
    model: CardFaceModel | null;
    open: boolean;
    /** Fired after the platform's `close` event; the caller restores focus. */
    onclosed: () => void;
  }

  let { model, open, onclosed }: Props = $props();

  let dialog = $state<HTMLDialogElement | null>(null);
  const titleId = $derived(model ? `card-title-${model.id}` : undefined);

  /** ADR-0010 §3: the dialog itself takes focus, so its name is read first. */
  $effect(() => {
    const node = dialog;
    if (!node) return;
    if (open && !node.open) {
      node.showModal();
      node.focus();
    } else if (!open && node.open) {
      node.close();
    }
  });

  $effect(() => {
    const node = dialog;
    if (!node) return;
    const handleClose = () => onclosed();
    node.addEventListener("close", handleClose);
    return () => node.removeEventListener("close", handleClose);
  });
</script>

<dialog
  class="card-dialog"
  bind:this={dialog}
  aria-labelledby={titleId}
  tabindex="-1"
  onclick={(event) => {
    // Backdrop dismissal (interaction-patterns "Card lightbox — dismiss"):
    // only a click whose target is the dialog itself, never its content.
    if (event.target === dialog) dialog?.close();
  }}
>
  {#if model}
    <div class="card-dialog__bar">
      <button
        type="button"
        class="card-dialog__close"
        aria-label={i18n.t("nav.close.card")}
        onclick={() => dialog?.close()}
      >
        ✕
      </button>
    </div>
    <CardFace {model} />
  {/if}
</dialog>

<style>
  .card-dialog {
    width: min(100%, var(--elsa-sizes-card-max));
    max-width: var(--elsa-sizes-card-max);
    padding: var(--elsa-spacing-3);
    border: var(--elsa-border-widths-hairline) solid var(--elsa-colors-line);
    border-radius: var(--elsa-radii-lg);
    background: var(--elsa-colors-bg-raised);
    color: var(--elsa-colors-ink);
  }

  .card-dialog::backdrop {
    background: var(--elsa-colors-bg);
  }

  .card-dialog__bar {
    display: flex;
    justify-content: flex-end;
    padding-bottom: var(--elsa-spacing-2);
  }

  .card-dialog__close {
    display: grid;
    place-items: center;
    min-width: var(--elsa-spacing-7);
    min-height: var(--elsa-spacing-7);
    border: var(--elsa-border-widths-hairline) solid var(--elsa-colors-line-strong);
    border-radius: var(--elsa-radii-pill);
    background: var(--elsa-colors-surface);
    color: var(--elsa-colors-ink);
    font-size: var(--elsa-font-sizes-lg);
  }

  .card-dialog__close:hover {
    background: var(--elsa-colors-surface-light);
  }
</style>
