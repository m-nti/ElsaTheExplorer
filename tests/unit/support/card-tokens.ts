/**
 * Reads `design/tokens/tokens.ts` as data for the card-scale tests (#89, #70).
 *
 * Why the token source and not a stylesheet parse: the em refactor's contract is
 * "one root em scale for everything inside the card", which is a statement about
 * the *values* the component consumes, not about the component's syntax. Mapping
 * each `var(--elsa-*)` back to the token it names lets a test say "no card
 * geometry consumes a px token" and "this em equals this px at the 340 px
 * reference" without a browser.
 *
 * The motion globals (`--elsa-dur-*`, `--elsa-ease-*`, `--elsa-tilt-perspective`)
 * are not Panda tokens; they are emitted from `design/tokens/motion.ts` and are
 * merged here so a typo in either namespace is still an unresolved name.
 */
import { cardCssVars, motionCssVars, tokens } from "@tokens";

/** `4cqw` of the 340 px reference card (`sizes.card-max`). */
export const CSS_REFERENCE_ROOT_PX = 13.6;

/** The px figure the art-bible pins every band and every em against. */
export const CARD_REFERENCE_PX = 340;

type TokenEntry = { readonly value: string | number };

/** Panda's token group name → the token group (the emitted `--elsa-<group>-`). */
const GROUPS: Readonly<Record<string, Readonly<Record<string, TokenEntry>>>> = {
  colors: tokens.colors,
  fonts: tokens.fonts,
  "font-sizes": tokens.fontSizes,
  "font-weights": tokens.fontWeights,
  "line-heights": tokens.lineHeights,
  "letter-spacings": tokens.letterSpacings,
  spacing: tokens.spacing,
  sizes: tokens.sizes,
  "aspect-ratios": tokens.aspectRatios,
  radii: tokens.radii,
  "border-widths": tokens.borderWidths,
  blurs: tokens.blurs,
  shadows: tokens.shadows,
  gradients: tokens.gradients,
};

const BY_VAR: ReadonlyMap<string, string> = new Map([
  ...Object.entries(GROUPS).flatMap(([group, entries]) =>
    Object.entries(entries).map(
      ([key, entry]) => [`--elsa-${group}-${key}`, String(entry.value)] as const,
    ),
  ),
  ...Object.entries(motionCssVars).map(
    ([name, value]) => [name, String(value)] as const,
  ),
  // The card's one em scale, published from `tokens.ts` beside the motion names.
  ...Object.entries(cardCssVars).map(
    ([name, value]) => [name, String(value)] as const,
  ),
  /**
   * Local runtime properties the component writes on itself
   * (`style:--elsa-tilt-x`). They are angles the pointer handler computes, not
   * published tokens — enumerated here so the "every reference resolves" guard
   * still catches a genuine typo.
   */
  ["--elsa-tilt-x", "0deg"],
  ["--elsa-tilt-y", "0deg"],
]);

/** The raw token value behind a `--elsa-*` custom property. Throws on a typo. */
export function tokenValue(name: string): string {
  const value = BY_VAR.get(name);
  if (value === undefined) throw new Error(`unknown token ${name}`);
  return value;
}

/** A px value at the 340 px reference for an em-valued token. */
export function emOf(name: string): number {
  const raw = tokenValue(name);
  const match = /^(-?\d*\.?\d+)em$/.exec(raw.trim());
  if (!match) throw new Error(`${name} is not a plain em value: ${raw}`);
  return Number(match[1]) * CSS_REFERENCE_ROOT_PX;
}

/** Every `var(--elsa-*)` reference in a stylesheet, in source order, deduped. */
export function elsaRefs(css: string): string[] {
  const found = new Set<string>();
  for (const match of css.matchAll(/var\(\s*(--elsa-[\w-]+)/g)) {
    found.add(match[1]!);
  }
  return [...found];
}
