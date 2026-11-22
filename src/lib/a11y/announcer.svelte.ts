/**
 * Announcer — the only module that writes an accessibility live region
 * (ADR-0010 §1–§2).
 *
 * Regions are mounted once in `App.svelte` and never created here: a region
 * built in the same frame as its first message is not announced by several
 * screen readers, and re-creating one to "force" an announcement is exactly the
 * failure this store exists to prevent. Writes are replacing, never queued; a
 * message stays until the next one.
 *
 * This ticket needs the polite half only (`#live-status`). The assertive
 * `#live-alert` ships empty and has no writer: it is admitted for a critical
 * failure a visitor cannot otherwise discover, and the reset is not one.
 */

const POLITE_REGION_ID = "live-status";

/** The only surface the store needs; `HTMLElement` satisfies it structurally. */
export interface AnnouncementRegion {
  textContent: string | null;
}

export type RegionResolver = () => AnnouncementRegion | null;

function resolveDocumentRegion(): AnnouncementRegion | null {
  if (typeof document === "undefined") return null;
  return document.getElementById(POLITE_REGION_ID);
}

/** §0.4.4 / D26: a terminal `!` never reaches an accessibility string. */
function normalise(message: string): string {
  return message.replace(/!\s*$/, ".");
}

export class AnnouncerStore {
  readonly #resolve: RegionResolver;

  constructor(resolve: RegionResolver = resolveDocumentRegion) {
    this.#resolve = resolve;
  }

  say(message: string): void {
    const region = this.#resolve();
    if (region === null) return;

    const text = normalise(message);
    if (region.textContent === text) {
      // Screen readers announce a change; an identical write is silent. Blank
      // first, then rewrite on the next frame (synchronously where no frame
      // exists, which is the node test environment).
      region.textContent = "";
      const rewrite = (): void => {
        region.textContent = text;
      };
      if (typeof requestAnimationFrame === "function") requestAnimationFrame(rewrite);
      else rewrite();
      return;
    }

    region.textContent = text;
  }
}

export const announcer = new AnnouncerStore();
