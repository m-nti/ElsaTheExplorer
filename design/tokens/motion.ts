/**
 * Motion tokens — the single typed source for `design/art/motion-sheet.md` §3.
 *
 * The motion sheet is the SSOT for *values*; this module is where those values
 * become code. Nothing in component CSS may invent a duration or a curve.
 *
 * Naming: the sheet publishes `--elsa-dur-*`, `--elsa-ease-*`, `--elsa-hold-*`,
 * `--elsa-stagger-*` and `--elsa-overlap`. Panda's token categories would emit
 * `--elsa-durations-*`; to keep the sheet's published names exactly, the values
 * are emitted verbatim as global custom properties from this module (see
 * `panda.config.ts`). One source, one emitted name, no alias layer.
 */

export const motionDurations = {
  fade: "140ms",
  settle: "220ms",
  cardin: "300ms",
  focus: "380ms",
  tile: "260ms",
  pullback: "760ms",
  "dialog-in": "200ms",
  "dialog-out": "160ms",
  flip: "420ms",
  flourish: "520ms",
  capstone: "520ms",
  glint: "5.2s",
  rays: "35s",
} as const;

export const motionIntervals = {
  "hold-beat": "260ms",
  "stagger-tile": "40ms",
  "stagger-line": "60ms",
  overlap: "35%",
} as const;

/** Every curve in the reveal is monotonic: no `y > 1`, no overshoot. */
export const motionEasings = {
  ease: "cubic-bezier(0.2, 0.8, 0.2, 1)",
  "ease-out": "cubic-bezier(0.25, 0.8, 0.3, 1)",
  "ease-soft": "cubic-bezier(0.16, 0.84, 0.24, 1)",
  "ease-focus": "cubic-bezier(0.22, 0.9, 0.24, 1)",
  "ease-pullback": "cubic-bezier(0.16, 1, 0.3, 1)",
  "ease-in": "cubic-bezier(0.4, 0, 1, 1)",
  "ease-flip": "cubic-bezier(0.3, 0.7, 0.2, 1)",
} as const;

const durations = Object.fromEntries(
  Object.entries(motionDurations).map(([name, value]) => [`--elsa-dur-${name}`, value]),
) as Record<`--elsa-dur-${keyof typeof motionDurations}`, string>;

const intervals = Object.fromEntries(
  Object.entries(motionIntervals).map(([name, value]) => [`--elsa-${name}`, value]),
) as Record<`--elsa-${keyof typeof motionIntervals}`, string>;

const easings = Object.fromEntries(
  Object.entries(motionEasings).map(([name, value]) => [`--elsa-${name}`, value]),
) as Record<`--elsa-${keyof typeof motionEasings}`, string>;

/**
 * Exact custom-property payload merged into Panda's `globalCss["\:root"]`.
 * Typed as a template-literal record so a typo in a published name is a
 * TypeScript error instead of a silently dead CSS variable.
 */
export const motionCssVars = {
  ...durations,
  ...intervals,
  ...easings,
  /**
   * The card's 3D stage depth. The shipped card used `perspective(1500px)`
   * (`legacy/assets/js/app.js`), and card-detail §5.3 keeps that material
   * verbatim — so the card's tilt reads the same at 180 px and 340 px.
   */
  "--elsa-tilt-perspective": "1500px",
} as const;
