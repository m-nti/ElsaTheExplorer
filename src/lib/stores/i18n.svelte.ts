/**
 * i18n store — reactive locale over the typed DE/EN dictionary.
 *
 * The dictionary itself lives in `dictionary.ts` (data, node-importable); this
 * module owns only the current locale and the `lang` attribute. Re-exported so
 * call sites keep a single import surface.
 */
import { DICTIONARIES, isLocale, LOCALES, type Dictionary, type Locale, type MessageKey } from "$lib/stores/dictionary";

export { DICTIONARIES, isLocale, LOCALES };
export type { Dictionary, Locale, MessageKey };

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
