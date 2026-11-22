/**
 * The photo window's crop anchor (#13, T4).
 *
 * The manifest carries `focus` as `{ x, y }` in 0..1 (ADR-0004 §2); the card
 * renders it as a CSS `object-position`. The default is the archive's reading
 * line, `center 42%` — the same value as `--elsa-sizes-photo-anchor`, which is
 * why the literal here is a mirror, not a second source.
 */

export interface FocusPoint {
  readonly x: number;
  readonly y: number;
}

/** The archive's default anchor: eye line at 42 % of the window's height. */
export const DEFAULT_FOCUS: FocusPoint = Object.freeze({ x: 0.5, y: 0.42 });

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

const percent = (value: number): string => `${Math.round(clamp01(value) * 100)}%`;

/**
 * `{x, y}` in 0..1 → a CSS `object-position`. Values outside 0..1 clamp; a
 * missing or malformed point falls back to `DEFAULT_FOCUS` (`center 42%`).
 */
export function focusToObjectPosition(focus?: FocusPoint | null): string {
  const point =
    focus && Number.isFinite(focus.x) && Number.isFinite(focus.y) ? focus : DEFAULT_FOCUS;
  return `${percent(point.x)} ${percent(point.y)}`;
}
