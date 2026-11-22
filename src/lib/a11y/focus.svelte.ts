import { restoreFocus } from "./focus";

/** The surfaces that own a focus-return contract (ADR-0010 §3). */
export type FocusSurface = "pack" | "card" | "reset";

/**
 * One opener per surface, last intent wins.
 *
 * Capture at intent, not at open (ADR-0010 §3): by the time a dialog is shown
 * the focused element is the dialog itself, so the caller records the control
 * that asked for the surface. The DOM validity of the recorded element is
 * judged at restore time, because the tile may have been re-rendered by then.
 */
export class FocusReturnStore {
  readonly #openers = new Map<FocusSurface, HTMLElement>();

  /** A `null`/`undefined` opener is the deep-link case and clears any stale one. */
  capture(surface: FocusSurface, opener: Element | null | undefined): void {
    if (opener) {
      this.#openers.set(surface, opener as HTMLElement);
      return;
    }
    this.#openers.delete(surface);
  }

  peek(surface: FocusSurface): HTMLElement | undefined {
    return this.#openers.get(surface);
  }

  forget(surface: FocusSurface): void {
    this.#openers.delete(surface);
  }

  /**
   * Consume the opener and run the ladder. Call from a microtask after the
   * dialog's native `close` event, so the platform's own focus reset does not
   * win (ADR-0010 §3, E-FOC-15).
   */
  restore(surface: FocusSurface, doc: Document = document): HTMLElement | null {
    const opener = this.#openers.get(surface) ?? null;
    this.#openers.delete(surface);
    return restoreFocus(opener, doc);
  }
}

export const focusReturn = new FocusReturnStore();
