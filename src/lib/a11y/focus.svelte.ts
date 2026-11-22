/**
 * Focus ownership for modal surfaces (ADR-0010 §3).
 *
 * One opener map and one return function. A surface captures the control that
 * opened it *at intent* (not when the dialog finally opens, when
 * `document.activeElement` is already the dialog), and restores in a microtask
 * after the native `close` event — `<dialog>`'s own focus reset runs on close
 * and wins otherwise.
 *
 * The ladder is fixed and shallow, because `<body>` is never a legal target:
 * the captured opener → `#open-pack` → `#stage` (which keeps `tabindex="-1"`
 * for exactly this rung). A candidate that is disconnected, disabled, inside
 * `[inert]` or not rendered drops to the next rung.
 */

export type SurfaceId = "reset";

// A plain Map is the point: nothing reads this reactively — it is a one-slot
// breadcrumb read once, inside a microtask, on close.
// eslint-disable-next-line svelte/prefer-svelte-reactivity
const openers = new Map<SurfaceId, HTMLElement>();

const LADDER: readonly (() => HTMLElement | null)[] = [
  () => byId("open-pack"),
  () => byId("stage"),
];

function byId(id: string): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return document.getElementById(id);
}

function isFocusable(candidate: HTMLElement | null): candidate is HTMLElement {
  if (candidate === null || !candidate.isConnected) return false;
  if (candidate.hasAttribute("disabled")) return false;
  if (candidate.closest("[inert]") !== null) return false;
  return candidate.getClientRects().length > 0;
}

/** Capture at intent: call before `showModal()`. */
export function captureOpener(surface: SurfaceId, opener: HTMLElement | null): void {
  if (opener === null) openers.delete(surface);
  else openers.set(surface, opener);
}

/** Call from the dialog's `close` event, whichever mechanism closed it. */
export function restoreFocus(surface: SurfaceId): void {
  const opener = openers.get(surface) ?? null;
  openers.delete(surface);

  queueMicrotask(() => {
    for (const candidate of [opener, ...LADDER.map((find) => find())]) {
      if (isFocusable(candidate)) {
        candidate.focus();
        return;
      }
    }
  });
}
