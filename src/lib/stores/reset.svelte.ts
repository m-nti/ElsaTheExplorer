/**
 * Reset orchestration — the wired half (#27).
 *
 * Only this module knows which singletons a confirmed reset touches; the order
 * lives in `reset.ts`. A component calls `resetAll()` after the confirmation
 * closes — never before, and never from the trigger.
 */
import { announcer } from "$lib/a11y/announcer.svelte";
import { persistence } from "$lib/io/persistence.svelte";
import { audio } from "$lib/stores/audio.svelte";
import { collection } from "$lib/stores/collection.svelte";
import { i18n } from "$lib/stores/i18n.svelte";
import { performReset, type ResetOutcome, type ResetPorts } from "$lib/stores/reset";

/** First-visit preferences: sound on, German. */
function resetPreferences(): void {
  audio.setMuted(true);
  i18n.setLocale("de");
}

const ports: ResetPorts = {
  wipe: () => persistence.wipe(),
  resetCollection: () => collection.reset(),
  resetPreferences,
  translate: (key) => i18n.t(key),
  announce: (message) => announcer.say(message),
};

export function resetAll(): ResetOutcome {
  return performReset(ports);
}
