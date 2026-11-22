<script lang="ts">
  import { announcer } from "$lib/a11y/announcer.svelte";
  import { focusReturn } from "$lib/a11y/focus.svelte";
  import { persistence } from "$lib/io/persistence.svelte";
  import { audio } from "$lib/stores/audio.svelte";
  import { collection } from "$lib/stores/collection.svelte";
  import { i18n } from "$lib/stores/i18n.svelte";
  import { performReset } from "$lib/stores/reset";

  /**
   * Reset with Confirmation (#27, `interaction-patterns` "Reset with
   * Confirmation"). The trigger never resets: it opens this dialog. Cancel is
   * the default focus, Escape and a backdrop click are Cancel, and only the
   * confirm button reaches `resetAll()`.
   *
   * `role="alertdialog"` (APG): a confirmation that names an irreversible loss
   * is announced with its title and description on open, so the whole
   * `reset.body` line is read rather than just the two buttons.
   */

  let sheet = $state<HTMLDialogElement | null>(null);
  let cancelButton = $state<HTMLButtonElement | null>(null);

  const available = persistence.available;

  function open(event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }): void {
    focusReturn.capture("reset", event.currentTarget);
    sheet?.showModal();
    cancelButton?.focus();
  }

  function close(): void {
    sheet?.close();
  }

  function onBackdrop(event: MouseEvent): void {
    if (event.target === sheet) close();
  }

  function onClose(): void {
    // After the native close reset (ADR-0010 §3, E-FOC-15), as the card dialog does.
    queueMicrotask(() => focusReturn.restore("reset"));
  }

  function onConfirm(): void {
    // Close first: the announcement is written into the document-level region,
    // and focus returns through the native close path.
    close();
    performReset({
      wipe: () => persistence.wipe(),
      resetCollection: () => collection.reset(),
      resetPreferences: () => {
        // First-visit preferences: sound on, German.
        audio.setMuted(true);
        i18n.setLocale("de");
      },
      translate: (key) => i18n.t(key),
      announce: (message) => announcer.say(message),
    });
  }
</script>

<div class="reset-control">
  <button
    type="button"
    class="reset-trigger"
    aria-haspopup="dialog"
    aria-describedby={available ? undefined : "reset-unavailable"}
    disabled={!available}
    onclick={open}
  >
    {i18n.t("reset.trigger")}
  </button>

  {#if !available}
    <p class="reset-note" id="reset-unavailable">{i18n.t("reset.unavailable")}</p>
  {/if}

  <dialog
    bind:this={sheet}
    class="reset-sheet"
    role="alertdialog"
    aria-labelledby="reset-title"
    aria-describedby="reset-body"
    onclick={onBackdrop}
    onclose={onClose}
  >
    <h2 class="reset-title" id="reset-title">{i18n.t("reset.title")}</h2>
    <p class="reset-body" id="reset-body">{i18n.t("reset.body")}</p>
    <div class="reset-actions">
      <button type="button" class="reset-cancel" bind:this={cancelButton} onclick={close}>
        {i18n.t("reset.cancel")}
      </button>
      <button type="button" class="reset-confirm" onclick={onConfirm}>
        {i18n.t("reset.confirm")}
      </button>
    </div>
  </dialog>
</div>

<style>
  /*
   * Quiet outline trigger, destructive confirm (the danger lives in the
   * dialog, not the trigger). Every value is a token: the 44 px floor is
   * `--elsa-sizes-target`, and the confirm reads as the primary action through
   * fill + label, never through colour alone.
   */
  .reset-control {
    display: grid;
    justify-items: start;
    gap: var(--elsa-spacing-2);
  }

  .reset-trigger,
  .reset-cancel,
  .reset-confirm {
    min-height: var(--elsa-sizes-target);
    padding-block: var(--elsa-spacing-2);
    padding-inline: var(--elsa-spacing-4);
    border: var(--elsa-border-widths-hairline) solid transparent;
    border-radius: var(--elsa-radii-pill);
    font-family: var(--elsa-fonts-body);
    font-size: var(--elsa-font-sizes-label);
    cursor: pointer;
  }

  .reset-trigger {
    border-color: var(--elsa-colors-line);
    background: transparent;
    color: var(--elsa-colors-muted);
  }

  .reset-trigger:hover:not(:disabled) {
    border-color: var(--elsa-colors-line-strong);
    color: var(--elsa-colors-ink);
  }

  .reset-trigger:disabled {
    color: var(--elsa-colors-quiet);
    cursor: not-allowed;
  }

  .reset-note {
    max-width: var(--elsa-sizes-card-max);
    color: var(--elsa-colors-muted);
    font-size: var(--elsa-font-sizes-sm);
    line-height: var(--elsa-line-heights-ui);
  }

  .reset-sheet {
    width: auto;
    max-width: var(--elsa-sizes-card-max);
    padding: var(--elsa-spacing-5);
    border: var(--elsa-border-widths-hairline) solid var(--elsa-colors-line-strong);
    border-radius: var(--elsa-radii-md);
    background: var(--elsa-colors-surface);
    color: var(--elsa-colors-ink);
    font-family: var(--elsa-fonts-body);
  }

  .reset-sheet::backdrop {
    background: transparent;
    backdrop-filter: blur(var(--elsa-blurs-veil));
  }

  /* The 200 ms dialog open (motion-sheet §3); reduced motion opens instantly. */
  .reset-sheet[open] {
    animation: reset-sheet-in var(--elsa-dur-dialog-in) var(--elsa-ease-out);
  }

  @keyframes reset-sheet-in {
    from {
      opacity: 0;
      transform: scale(0.96);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .reset-sheet[open] {
      animation: none;
    }
  }

  .reset-title {
    font-family: var(--elsa-fonts-print);
    font-size: var(--elsa-font-sizes-xl);
    font-weight: var(--elsa-font-weights-regular);
    line-height: var(--elsa-line-heights-display);
  }

  .reset-body {
    margin-block-start: var(--elsa-spacing-3);
    color: var(--elsa-colors-muted);
    font-size: var(--elsa-font-sizes-md);
    line-height: var(--elsa-line-heights-ui);
  }

  .reset-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--elsa-spacing-3);
    margin-block-start: var(--elsa-spacing-5);
  }

  .reset-cancel {
    border-color: var(--elsa-colors-line-strong);
    background: transparent;
    color: var(--elsa-colors-ink);
  }

  .reset-confirm {
    border-color: var(--elsa-colors-accent);
    background: var(--elsa-colors-accent);
    color: var(--elsa-colors-bg);
    font-weight: var(--elsa-font-weights-semibold);
  }
</style>
