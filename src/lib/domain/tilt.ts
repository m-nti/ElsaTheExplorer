/**
 * The card's tilt targets (#13, T7).
 *
 * Authority: `design/ux/card-detail.md` §5.3 row A (keyboard tilt, **7° per
 * press, clamped ±18° pitch / ±20° yaw**) and row "Pointer move / hover"
 * (target yaw `(x − .5) × 2 × 17°`, pitch `−(y − .5) × 2 × 15°`), which
 * `design/ux/interaction-patterns.md` restates as the shipped behaviour.
 *
 * Two functions, one convention: the returned numbers are the **angles applied
 * as `rotateX(x) rotateY(y)`** — the same order the shipped `app.js` used
 * (`perspective(1500px) translateZ(…) rotateX(rx) rotateY(ry)`). The reference
 * note writes the pointer pitch as `−(y − .5) × 2 × 15` on the *target*; here
 * the value **is** the `rotateX` angle, so the sign is applied once, at this
 * boundary, and pinned by `tests/unit/tilt.test.ts` rather than re-derived in
 * the component.
 *
 * Reduced motion is not a smaller tilt: every function returns the rest frame
 * (`{0, 0}`) so no movement can carry information (ADR-0010 §4, art-bible §8
 * rule 5). The component still reads the motion store — never the OS query.
 */

/** The size of one keyboard step, in degrees. */
export const TILT_STEP = 7;

/** The keyboard rack: pitch (rotateX) may not exceed this. */
export const TILT_MAX_PITCH = 18;

/** The keyboard rack: yaw (rotateY) may not exceed this. */
export const TILT_MAX_YAW = 20;

/** The pointer rack for pitch — the shipped card's `±15°`. */
export const TILT_POINTER_PITCH = 15;

/** The pointer rack for yaw — the shipped card's `±17°`. */
export const TILT_POINTER_YAW = 17;

/** The rest frame. Frozen so a consumer cannot mutate the shared zero. */
export interface TiltTarget {
  /** `rotateX` in degrees. Negative tips the top toward the viewer. */
  readonly x: number;
  /** `rotateY` in degrees. Positive turns the right edge away. */
  readonly y: number;
}

export const ZERO_TILT: TiltTarget = Object.freeze({ x: 0, y: 0 });

/**
 * Bound a value into `[min, max]`, treating a non-finite input as rest and
 * normalising `-0` to `0` so the emitted CSS never reads `rotateX(-0deg)`.
 */
function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return 0;
  const bounded = Math.min(max, Math.max(min, value));
  return bounded === 0 ? 0 : bounded;
}

/**
 * The keyboard tilt target: `stepsX` is `→`−`←` and `stepsY` is `↓`−`↑`, each
 * press one `TILT_STEP`. Down pitches the top away, matching the pointer
 * convention in `tiltForPointer`.
 */
export function tiltFor(stepsX: number, stepsY: number, reduce: boolean): TiltTarget {
  if (reduce) return ZERO_TILT;
  return {
    x: clamp(-stepsY * TILT_STEP, -TILT_MAX_PITCH, TILT_MAX_PITCH),
    y: clamp(stepsX * TILT_STEP, -TILT_MAX_YAW, TILT_MAX_YAW),
  };
}

/**
 * The pointer tilt target for a position inside the card, expressed as
 * fractions `0..1`. The card leans toward the pointer; values outside the card
 * clamp to the rack instead of extrapolating.
 */
export function tiltForPointer(fx: number, fy: number, reduce: boolean): TiltTarget {
  if (reduce) return ZERO_TILT;
  return {
    x: clamp(-(fy - 0.5) * 2 * TILT_POINTER_PITCH, -TILT_POINTER_PITCH, TILT_POINTER_PITCH),
    y: clamp((fx - 0.5) * 2 * TILT_POINTER_YAW, -TILT_POINTER_YAW, TILT_POINTER_YAW),
  };
}
