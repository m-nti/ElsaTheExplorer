/**
 * Typed DE/EN dictionary — data, not state.
 *
 * Kept apart from `i18n.svelte.ts` so the dictionary is importable by node
 * tests (no runes compilation) and so the copy-drift gates compare data to the
 * copy deck, not a mounted store. `i18n.svelte.ts` re-exports this surface, so
 * call sites keep importing from the store.
 *
 * DE is the master; EN must satisfy the same `Dictionary`. The deck
 * (`design/copy/copy-deck.md`) is the source of record for every value.
 */

export const LOCALES = ["de", "en"] as const;

export type Locale = (typeof LOCALES)[number];

export type MessageKey =
  | "app.title"
  | "app.tagline"
  | "card.serial"
  | "state.offline"
  | "state.error.catalogue"
  | "reset.trigger"
  | "reset.title"
  | "reset.body"
  | "reset.confirm"
  | "reset.cancel"
  | "reset.unavailable"
  | "live.reset.done";

export type Dictionary = Readonly<Record<MessageKey, string>>;

const DE: Dictionary = {
  "app.title": "Elsa the Explorer",
  "app.tagline": "Die Sammlung ist das Produkt. Elsa ist der Sammlungsmechanismus.",
  "card.serial": "ELSA · {number}",
  "state.offline": "Die Sammlung ist gerade offline. Die zuletzt gesammelten Karten bleiben lesbar.",
  "state.error.catalogue": "Die Sammlung kommt gleich wieder.",
  "reset.trigger": "Von vorn",
  "reset.title": "Von vorn?",
  "reset.body":
    "Das löscht die Sammlung, die Räume samt Fortschritt, die Meilensteine und Elsas Ehrenmensch — Ton und Sprache kehren auf Standard zurück.",
  "reset.confirm": "Alles löschen",
  "reset.cancel": "Abbrechen",
  "reset.unavailable": "Dieses Gerät kann gerade nichts speichern. Von vorn bleibt gesperrt.",
  "live.reset.done": "Von vorn. Alle Karten können wieder kommen.",
};

const EN: Dictionary = {
  "app.title": "Elsa the Explorer",
  "app.tagline": "The collection is the product. Elsa is the collection mechanism.",
  "card.serial": "ELSA · {number}",
  "state.offline": "The collection is offline. The cards you have collected remain readable.",
  "state.error.catalogue": "The collection will be back shortly.",
  "reset.trigger": "Start over",
  "reset.title": "Start over?",
  "reset.body":
    "This clears the Collection, room progress, the milestones and Elsa's Honorary Human — sound and language go back to default.",
  "reset.confirm": "Delete everything",
  "reset.cancel": "Cancel",
  "reset.unavailable": "This device cannot save right now. Starting over stays locked.",
  "live.reset.done": "Starting over. Every card can come up again.",
};

export const DICTIONARIES: Readonly<Record<Locale, Dictionary>> = { de: DE, en: EN };

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}
