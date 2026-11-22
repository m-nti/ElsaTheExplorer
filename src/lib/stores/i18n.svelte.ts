/**
 * i18n store — typed DE/EN surface. DE is the master; EN must satisfy the same
 * Dictionary. The full copy deck lands with the copy pass; these keys exist so
 * the store's API (and the parity tests) are real from day one.
 */

export const LOCALES = ["de", "en"] as const;

export type Locale = (typeof LOCALES)[number];

export type MessageKey =
  | "app.title"
  | "app.tagline"
  | "card.serial"
  | "card.image.alt"
  | "catalogue.title"
  | "catalogue.lede"
  | "nav.catalogue"
  | "nav.close.card"
  | "tile.aria.open"
  | "tile.aria.open.unseen"
  | "tile.state.collected"
  | "tile.state.unseen"
  | "state.offline"
  | "state.error.catalogue";

export type Dictionary = Readonly<Record<MessageKey, string>>;

const DE: Dictionary = {
  "app.title": "Elsa the Explorer",
  "app.tagline": "Die Sammlung ist das Produkt. Elsa ist der Sammlungsmechanismus.",
  "card.serial": "ELSA · {number}",
  "card.image.alt": "{name}",
  "catalogue.title": "Die Sammlung",
  "catalogue.lede":
    "Jedes Schmuckstück, das es gibt — öffne eines für die ganze Geschichte.",
  "nav.catalogue": "Zur Sammlung",
  "nav.close.card": "Diese Karte schließen",
  "tile.aria.open": "Karte {number} öffnen: {name}, gesammelt",
  "tile.aria.open.unseen": "Karte {number} öffnen: {name}, noch nicht gesammelt",
  "tile.state.collected": "gesammelt",
  "tile.state.unseen": "noch nicht gesammelt",
  "state.offline": "Die Sammlung ist gerade offline. Die zuletzt gesammelten Karten bleiben lesbar.",
  "state.error.catalogue": "Die Sammlung kommt gleich wieder.",
};

const EN: Dictionary = {
  "app.title": "Elsa the Explorer",
  "app.tagline": "The collection is the product. Elsa is the collection mechanism.",
  "card.serial": "ELSA · {number}",
  "card.image.alt": "{name}",
  "catalogue.title": "The Collection",
  "catalogue.lede": "Every treasure there is — open one for the whole story.",
  "nav.catalogue": "To the collection",
  "nav.close.card": "Close this card",
  "tile.aria.open": "Open card {number}: {name}, collected",
  "tile.aria.open.unseen": "Open card {number}: {name}, not yet collected",
  "tile.state.collected": "collected",
  "tile.state.unseen": "not yet collected",
  "state.offline": "The collection is offline. The cards you have collected remain readable.",
  "state.error.catalogue": "The collection will be back shortly.",
};

export const DICTIONARIES: Readonly<Record<Locale, Dictionary>> = { de: DE, en: EN };

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export class I18nStore {
  #locale = $state<Locale>("de");

  get locale(): Locale {
    return this.#locale;
  }

  get dictionary(): Dictionary {
    return DICTIONARIES[this.#locale];
  }

  get dir(): "ltr" {
    return "ltr";
  }

  setLocale(locale: Locale): void {
    this.#locale = locale;
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
    }
  }

  toggle(): Locale {
    this.setLocale(this.#locale === "de" ? "en" : "de");
    return this.#locale;
  }

  t(key: MessageKey): string {
    return this.dictionary[key];
  }

  /** Placeholder substitution only; copy may not invent new placeholders. */
  format(key: MessageKey, values: Readonly<Record<string, string>>): string {
    return this.t(key).replace(/\{(\w+)\}/g, (match, name: string) => values[name] ?? match);
  }
}

export const i18n = new I18nStore();
