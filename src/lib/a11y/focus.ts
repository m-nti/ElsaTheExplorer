/**
 * Focus-return helpers (ADR-0010 §3).
 *
 * One ladder, one implementation: the captured opener, then the page CTA,
 * then the stage. `<body>` is never a legal target, and a candidate is
 * validated before it is focused — a disabled, detached, inert or hidden
 * element drops to the next rung instead of stranding the visitor at the top
 * of the document (a11y-baseline M3/M4, #28).
 */

/** The page's primary CTA (ADR-0010 §3 rung 2). */
export const FOCUS_HOME_ID = "open-pack";

/** The programmatic-only fallback region (ADR-0010 §3 rung 3). */
export const FOCUS_STAGE_ID = "stage";

/**
 * The ladder itself, pure and DOM-free so it can be unit-tested in the node
 * project: the first candidate the caller accepts, or `null`. It never
 * invents a target.
 */
export function selectFocusTarget<T>(
  candidates: readonly (T | null | undefined)[],
  isUsable: (candidate: T) => boolean,
): T | null {
  for (const candidate of candidates) {
    if (candidate === null || candidate === undefined) continue;
    if (isUsable(candidate)) return candidate;
  }
  return null;
}

function isHtmlElement(value: unknown): value is HTMLElement {
  return typeof HTMLElement !== "undefined" && value instanceof HTMLElement;
}

/** A candidate is legal only if focusing it can actually move focus. */
export function isFocusableTarget(candidate: Element | null | undefined): candidate is HTMLElement {
  if (!isHtmlElement(candidate)) return false;
  if (candidate === document.body || candidate === document.documentElement) return false;
  if (!candidate.isConnected) return false;
  if (candidate.matches(":disabled")) return false;
  if (candidate.closest("[inert]")) return false;
  const style = getComputedStyle(candidate);
  if (style.display === "none" || style.visibility === "hidden") return false;
  return true;
}

/**
 * Restore focus through the ADR-0010 §3 ladder. Returns the element that took
 * focus, or `null` when no rung is usable — `<body>` is never returned and
 * never focused.
 */
export function restoreFocus(
  opener: Element | null | undefined,
  doc: Document = document,
): HTMLElement | null {
  const target = selectFocusTarget(
    [opener ?? null, doc.getElementById(FOCUS_HOME_ID), doc.getElementById(FOCUS_STAGE_ID)],
    isFocusableTarget,
  );
  if (!isFocusableTarget(target)) return null;
  target.focus({ preventScroll: true });
  return target;
}
