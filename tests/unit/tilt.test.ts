/**
 * Tilt and the reduced-motion final frame (#13, T7).
 *
 * Authority: `design/ux/card-detail.md` §5.3 (A "keyboard foil tilt": ±7°/step,
 * clamped ±18°/±20°; pointer targets yaw ±17°, pitch ±15°), §10 (tilt is
 * continuous, skipped entirely by reduced motion) and ADR-0010 §4 ("every JS
 * reader consumes the store — including the tilt spring"; exactly one
 * `matchMedia` call in `src/`).
 *
 * Two layers are proven here, and they fail for different reasons:
 * - the **domain**: pure functions, so the clamps and the reduced-motion zeros
 *   are arithmetic facts, not a rendered hope;
 * - the **component contract**: the face consumes the store, the final frame is
 *   declared in CSS, and no movement carries information (the tilt is a
 *   transform and nothing else — no `aria-*` depends on it).
 *
 * The rendered proof (500 ms of computed styles, two samples) is T9's
 * Playwright slice: E-RM-03 and E-RM-08.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  TILT_MAX_PITCH,
  TILT_MAX_YAW,
  TILT_POINTER_PITCH,
  TILT_POINTER_YAW,
  TILT_STEP,
  tiltFor,
  tiltForPointer,
} from "$lib/domain/tilt";
import { cssRules, markupOf, readCardFace, styleOf } from "./support/cardface-source";

describe("tilt targets (#13, T7)", () => {
  it("pins the ratified step and clamps", () => {
    // card-detail §5.3 A and the motion sheet's keyboard row.
    expect(TILT_STEP).toBe(7);
    expect(TILT_MAX_PITCH).toBe(18);
    expect(TILT_MAX_YAW).toBe(20);
    expect(TILT_POINTER_PITCH).toBe(15);
    expect(TILT_POINTER_YAW).toBe(17);
  });

  it("is at rest for a zero step", () => {
    expect(tiltFor(0, 0, false)).toEqual({ x: 0, y: 0 });
  });

  it("moves 7° per step, on the axis the key names", () => {
    // `→` yaws, `↓` pitches. The pitch sign is the pointer convention kept
    // verbatim from the shipped card (interaction-patterns "Pointer move"):
    // moving the pointer down tips the top toward the viewer.
    expect(tiltFor(1, 0, false)).toEqual({ x: 0, y: 7 });
    expect(tiltFor(-1, 0, false)).toEqual({ x: 0, y: -7 });
    expect(tiltFor(0, 1, false)).toEqual({ x: -7, y: 0 });
    expect(tiltFor(0, -1, false)).toEqual({ x: 7, y: 0 });
    expect(tiltFor(2, -1, false)).toEqual({ x: 7, y: 14 });
  });

  it("clamps at ±18 pitch and ±20 yaw — 1000 steps is still the rack", () => {
    expect(tiltFor(1000, 1000, false)).toEqual({ x: -TILT_MAX_PITCH, y: TILT_MAX_YAW });
    expect(tiltFor(-1000, -1000, false)).toEqual({ x: TILT_MAX_PITCH, y: -TILT_MAX_YAW });
  });

  it("returns the rest frame under reduced motion, at any input", () => {
    // E-RM-03/U-KEYS-02: reduced motion is not a smaller tilt, it is no tilt.
    for (const [dx, dy] of [
      [1, 1],
      [-3, 2],
      [1000, -1000],
    ]) {
      expect(tiltFor(dx as number, dy as number, true)).toEqual({ x: 0, y: 0 });
    }
  });
});

describe("pointer tilt targets (#13, T7)", () => {
  it("maps the card's top-left and bottom-right corners to the ratified rack", () => {
    expect(tiltForPointer(0, 0, false)).toEqual({ x: TILT_POINTER_PITCH, y: -TILT_POINTER_YAW });
    expect(tiltForPointer(1, 1, false)).toEqual({ x: -TILT_POINTER_PITCH, y: TILT_POINTER_YAW });
    expect(tiltForPointer(0.5, 0.5, false)).toEqual({ x: 0, y: 0 });
  });

  it("clamps a pointer that reports outside the card", () => {
    expect(tiltForPointer(2, -1, false)).toEqual({
      x: TILT_POINTER_PITCH,
      y: TILT_POINTER_YAW,
    });
    expect(tiltForPointer(Number.NaN, 0.5, false)).toEqual({ x: 0, y: 0 });
  });

  it("returns the rest frame under reduced motion", () => {
    expect(tiltForPointer(0, 0, true)).toEqual({ x: 0, y: 0 });
    expect(tiltForPointer(0.9, 0.1, true)).toEqual({ x: 0, y: 0 });
  });
});

describe("one motion reader (ADR-0010 §4)", () => {
  const source = readCardFace();

  it("keeps the single matchMedia call in the motion store", () => {
    const files: string[] = [];
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.(?:ts|svelte)$/.test(entry.name)) files.push(full);
      }
    };
    walk("src");

    const readers = files.filter((file) => readFileSync(file, "utf8").includes("matchMedia"));

    expect(readers.map((file) => file.replaceAll("\\", "/"))).toEqual([
      "src/lib/a11y/motion.svelte.ts",
    ]);
  });

  it("has the face consume the store instead of asking the OS itself", () => {
    expect(source).toContain('from "$lib/a11y/motion.svelte"');
    expect(source).not.toContain("matchMedia");
  });
});

describe("reduced-motion final frame (#13, T7)", () => {
  const source = readCardFace();
  const rules = cssRules(styleOf(source));
  const reduced = rules.filter((rule) =>
    rule.atRules.some((at) => at.includes("prefers-reduced-motion")),
  );
  const declarations = (selector: string, at = reduced) =>
    at
      .filter((rule) => rule.selectors.includes(selector))
      .flatMap((rule) => rule.declarations);
  const valueOf = (selector: string, property: string) =>
    declarations(selector).find((declaration) => declaration.property === property)?.value;

  it("writes the tilt as custom properties on the decorative transform only", () => {
    // No motion carries information: the two variables are consumed by
    // `transform`, and nothing else in the component reads them.
    const markup = markupOf(source);
    expect(markup).toContain("style:--elsa-tilt-x");
    expect(markup).toContain("style:--elsa-tilt-y");
    expect(markup).not.toMatch(/aria-[a-z]+=\{[^}]*tilt/i);
  });

  it("builds the transform from the perspective token and the two variables", () => {
    const transform = rules
      .filter((rule) => rule.selectors.includes(".card-face"))
      .flatMap((rule) => rule.declarations)
      .find((declaration) => declaration.property === "transform")?.value;

    expect(transform).toContain("perspective(var(--elsa-tilt-perspective))");
    expect(transform).toContain("rotateX(var(--elsa-tilt-x))");
    expect(transform).toContain("rotateY(var(--elsa-tilt-y))");
  });

  it("settles through a motion token, never an invented duration", () => {
    const transition = rules
      .filter((rule) => rule.selectors.includes(".card-face"))
      .flatMap((rule) => rule.declarations)
      .find((declaration) => declaration.property === "transition")?.value;

    expect(transition).toContain("var(--elsa-dur-");
    expect(transition).toContain("var(--elsa-ease-");
  });

  it("declares the final frame: no transform, no transition, no sweep", () => {
    expect(valueOf(".card-face", "transform")).toBe("none");
    expect(valueOf(".card-face", "transition")).toBe("none");

    // The glint is the only autonomous motion; it is frozen, not deleted, so
    // the static material keeps its tier opacity (art-bible §8 rule 5).
    expect(valueOf(".glint", "animation")).toBe("none");
    expect(valueOf(".glint", "opacity")).toBe("0");

    // Nothing else may animate under reduced motion.
    for (const rule of reduced) {
      for (const declaration of rule.declarations) {
        if (declaration.property !== "animation") continue;
        expect(declaration.value).toBe("none");
      }
    }
  });
});
