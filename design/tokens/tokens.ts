/**
 * The token source — palette, spacing, type, radii, gradients and the rarity
 * tier table. This file is the single authority for values (ADR-0002).
 *
 * Rules encoded here:
 * - Art-bible values are mapped verbatim, with two measured exceptions:
 *   1. `quiet` — owner ruling 2026-11-22: raised to pass 4.5:1 on every
 *      structural surface. The shipped `#756e7d` measured 3.86:1 on `--bg`,
 *      3.56:1 on `--bg-raised` and 3.36:1 on `--surface`. `#978fa0` measures
 *      6.08 / 5.62 / 5.30 / 4.66 on bg / raised / surface / surface-light.
 *   2. `credit` — the art bible's shipped `#928697` passes on the body plate
 *      (4.56:1) but measures 4.23:1 on the lightest header stop; it is a
 *      "practically fragile" 8px token. Raised to `#9a8da0` (5.02:1 body,
 *      4.65:1 header) so it passes on every plate stop it can sit on.
 * - The rarity tier table is ONE typed artifact. CSS consumes `--tier-*`;
 *   CSS never redefines them. Adding a tier is a compile-time change here.
 * - `contrastPairs` is the declared usage set the Vitest gate enumerates.
 */

import { defineRecipe, defineTokens } from "@pandacss/dev";
import type { ContrastPair } from "../../src/lib/domain/contrast";
import type { StarCount } from "../../src/lib/domain/card-stars";
import type { RarityTier } from "../../src/lib/domain/rarity";
import { motionCssVars } from "./motion";

const value = <T>(input: T): { value: T } => ({ value: input });

export const palette = {
  // Building — cool structural surfaces. Never carry meaning.
  bg: "#111017",
  bgRaised: "#1b1823",
  surface: "#211d2a",
  surfaceLight: "#2c2736",
  desk: "#15131b",
  floor: "#100f15",

  // Paper & metal — warm, meaning-bearing.
  ink: "#f5f0ea",
  muted: "#aaa3b2",
  /** Raised from the shipped `#756e7d`; see the file header measurement. */
  quiet: "#978fa0",
  metal: "#d4c2a8",
  metalDark: "#8e7c67",
  accent: "#e8c9a5",
  accentBright: "#f7e0c2",

  // Hairlines / chrome.
  line: "rgb(245 240 234 / 14%)",
  lineStrong: "rgb(245 240 234 / 28%)",
  // Empty star slot: meaningful (the row is a 5-slot scale), so it must clear 3:1 on the plate.
  starEmpty: "rgb(245 240 234 / 38%)",
  mask: "#000000",
  chipText: "#211d27",
  focusCard: "#fff0d9",

  // Card plates.
  plateHeaderFrom: "#2c2636",
  plateHeaderTo: "#17151c",
  plateBodyFrom: "#25212d",
  plateBodyTo: "#16141b",

  // Card print colours, measured against their plate stops.
  printName: "#fbf5ed",
  /** Print sheet paper + ink (light document, not the dark parlour). */
  printPaper: "#f7f4ee",
  printInk: "#1c1a20",
  printNumber: "#c4b7aa",
  printMood: "#c5b8c6",
  printRarity: "#e5d7c6",
  printKeyword: "#f0d5bd",
  printCopy: "#d6cdd7",
  printLine: "#b7aab8",
  printStatKey: "#b8adbb",
  printStatValue: "#f6eee5",
  printSerial: "#b7aaba",
  printCredit: "#9a8da0",
  printStatsLabel: "#bfb1ca",
  printKind: "#c2b7c5",

  // Star metal: one warm metal, three brightnesses.
  starCommon: "#ead7b7",
  starRare: "#eccba9",
  starHolo: "#f0dcb9",
} as const;

/** The typed rarity tier table (art-bible §4). Values are the §8 numeric ranges. */
export interface RarityTierSpec {
  readonly label: Readonly<{ de: string; en: string }>;
  /** Foil edge-ring opacity — 0 / 0.28 / 0.42–0.56 (art-bible §8). */
  readonly ring: number;
  /** Photo-window interference strength — 0 / 0.08 / ≤ 0.32. */
  readonly photo: number;
  /** Glitter-plane opacity. Kept ≤ 0.3 so the reduced-motion static frame is legal. */
  readonly glitter: number;
  /** Pointer glow radius, in card-root em so it scales with the plate. */
  readonly glow: string;
  /** Foil strength — the art-direction dial; same caps as `ring`. */
  readonly foilStrength: number;
  readonly glint: Readonly<{ duration: string; opacity: number }>;
  readonly rays: number;
  /**
   * Filled slots in the card strip — 3 / 4 / 5 of five (#51). The union comes
   * from the domain so an out-of-scale value is a compile error, and
   * `tests/unit/card-stars.test.ts` pins each row to `RARITY_STARS`.
   */
  readonly stars: StarCount;
  readonly starColor: string;
  readonly chip: Readonly<{ background: string; color: string; border: string }>;
  readonly name: Readonly<{ color: string; fill: string; image: string; shadow: string }>;
  readonly edge: number;
  readonly etch: number;
}

const rise = "drop-shadow(0 1px rgb(0 0 0 / 55%))";

export const RARITY_TIERS: Readonly<Record<RarityTier, RarityTierSpec>> = {
  common: {
    label: { de: "Häufig", en: "Common" },
    ring: 0,
    photo: 0,
    glitter: 0,
    glow: "0em",
    foilStrength: 0,
    glint: { duration: "0s", opacity: 0 },
    rays: 0,
    stars: 3,
    starColor: palette.starCommon,
    chip: {
      background: "rgb(245 240 234 / 6%)",
      color: `var(--elsa-colors-print-rarity)`,
      border: `var(--elsa-colors-line)`,
    },
    name: {
      color: `var(--elsa-colors-print-name)`,
      fill: "currentColor",
      image: "none",
      shadow: "none",
    },
    edge: 0.12,
    etch: 0,
  },
  rare: {
    label: { de: "Selten", en: "Rare" },
    ring: 0.28,
    photo: 0.08,
    glitter: 0.14,
    glow: "0.9em",
    foilStrength: 0.28,
    glint: { duration: "5.2s", opacity: 0.34 },
    rays: 0,
    stars: 4,
    starColor: palette.starRare,
    chip: {
      background: `var(--elsa-gradients-foil-pastel)`,
      color: `var(--elsa-colors-chip-text)`,
      border: "rgb(245 240 234 / 24%)",
    },
    name: {
      color: `var(--elsa-colors-print-name)`,
      fill: "transparent",
      image: `linear-gradient(112deg, var(--elsa-colors-print-name), var(--elsa-colors-print-rarity))`,
      shadow: rise,
    },
    edge: 0.28,
    etch: 0.35,
  },
  holo: {
    label: { de: "Holo-Pracht", en: "Holo splendor" },
    ring: 0.56,
    photo: 0.32,
    glitter: 0.28,
    glow: "1.4em",
    foilStrength: 0.56,
    glint: { duration: "5.2s", opacity: 0.56 },
    rays: 0.5,
    stars: 5,
    starColor: palette.starHolo,
    chip: {
      background: `var(--elsa-gradients-foil-spectrum)`,
      color: `var(--elsa-colors-chip-text)`,
      border: "rgb(245 240 234 / 34%)",
    },
    name: {
      color: `var(--elsa-colors-print-name)`,
      fill: "transparent",
      image: `linear-gradient(112deg, #ff6dbd, #ffd35b, #86edbd, #67d7ff)`,
      shadow: rise,
    },
    edge: 0.56,
    etch: 0.55,
  },
};

function tierVars(tier: RarityTier): Record<`--tier-${string}`, string> {
  const spec = RARITY_TIERS[tier];
  return {
    "--tier-ring-opacity": String(spec.ring),
    "--tier-photo-foil": String(spec.photo),
    "--tier-glitter-opacity": String(spec.glitter),
    "--tier-glow-size": spec.glow,
    "--tier-glow-opacity": String(spec.ring),
    "--tier-foil-strength": String(spec.foilStrength),
    "--tier-glint-duration": spec.glint.duration,
    "--tier-glint-opacity": String(spec.glint.opacity),
    "--tier-rays-opacity": String(spec.rays),
    "--tier-star-color": spec.starColor,
    "--tier-chip-background": spec.chip.background,
    "--tier-chip-color": spec.chip.color,
    "--tier-chip-border": spec.chip.border,
    "--tier-name-color": spec.name.color,
    "--tier-name-fill": spec.name.fill,
    "--tier-name-image": spec.name.image,
    "--tier-name-shadow": spec.name.shadow,
    "--tier-edge-opacity": String(spec.edge),
    "--tier-etch-opacity": String(spec.etch),
  };
}

/**
 * Exhaustiveness guard: a new member of `RarityTier` without a matching tier
 * spec and variant is a TypeScript error here. This is the compile-time
 * replacement for the three drifting holo values the v1 stylesheets shipped.
 */
const rarityVariants = {
  common: tierVars("common"),
  rare: tierVars("rare"),
  holo: tierVars("holo"),
} satisfies Record<RarityTier, Record<`--tier-${string}`, string>>;

/**
 * The ONLY sanctioned variant mechanism for rarity (ADR-0002).
 * Class names come from `styled-system/recipes`; the variant set is exhaustive
 * at compile time, so a fourth tier cannot ship without being added above.
 */
export const rarityRecipe = defineRecipe({
  className: "rarity",
  description: "Rarity tier: the typed home of foil ring, photo, glitter and glow physics.",
  base: {},
  variants: {
    rarity: rarityVariants,
  },
  defaultVariants: {
    rarity: "common",
  },
});

export const tokens = defineTokens({
  colors: {
    bg: value(palette.bg),
    "bg-raised": value(palette.bgRaised),
    surface: value(palette.surface),
    "surface-light": value(palette.surfaceLight),
    desk: value(palette.desk),
    floor: value(palette.floor),

    ink: value(palette.ink),
    muted: value(palette.muted),
    quiet: value(palette.quiet),
    metal: value(palette.metal),
    "metal-dark": value(palette.metalDark),
    accent: value(palette.accent),
    "accent-bright": value(palette.accentBright),

    line: value(palette.line),
    "line-strong": value(palette.lineStrong),
    "star-empty": value(palette.starEmpty),
    mask: value(palette.mask),
    "chip-text": value(palette.chipText),
    "focus-card": value(palette.focusCard),

    "plate-header-from": value(palette.plateHeaderFrom),
    "plate-header-to": value(palette.plateHeaderTo),
    "plate-body-from": value(palette.plateBodyFrom),
    "plate-body-to": value(palette.plateBodyTo),

    "print-name": value(palette.printName),
    "print-paper": value(palette.printPaper),
    "print-ink": value(palette.printInk),
    "print-number": value(palette.printNumber),
    "print-mood": value(palette.printMood),
    "print-rarity": value(palette.printRarity),
    "print-keyword": value(palette.printKeyword),
    "print-copy": value(palette.printCopy),
    "print-line": value(palette.printLine),
    "print-stat-key": value(palette.printStatKey),
    "print-stat-value": value(palette.printStatValue),
    "print-serial": value(palette.printSerial),
    "print-credit": value(palette.printCredit),
    "print-stats-label": value(palette.printStatsLabel),
    "print-kind": value(palette.printKind),
  },

  fonts: {
    body: value('"Chivo", "Avenir Next", Avenir, system-ui, sans-serif'),
    print: value('"Ultra", "Chivo", Georgia, serif'),
  },

  fontSizes: {
    label: value("13px"),
    chip: value("12px"),
    sm: value("11px"),
    md: value("13px"),
    xl: value("19px"),
    display: value("clamp(52px, 6vw, 86px)"),
  },

  fontWeights: {
    regular: value(400),
    medium: value(500),
    semibold: value(600),
    bold: value(700),
  },

  lineHeights: {
    display: value(1),
    card: value(1.35),
    ui: value(1.5),
  },

  letterSpacings: {
    eyebrow: value("0.14em"),
    display: value("-0.06em"),
    "display-tight": value("-0.075em"),
  },

  spacing: {
    1: value("4px"),
    2: value("8px"),
    3: value("12px"),
    4: value("16px"),
    5: value("24px"),
    6: value("32px"),
    7: value("48px"),
    8: value("72px"),
    9: value("104px"),
  },

  sizes: {
    "card-min": value("180px"),
    "card-max": value("340px"),
    content: value("1440px"),
    // Card bays — art-bible §8, D12a ruling (#47). Percentages of the plate's
    // inner height; the seven bays sum to exactly 100 %. `zone-header` is §8's
    // plate bay (name row + number/mood/chip row). `zone-gutters` is the
    // content-free bay: it is consumed as the 5 gaps between the six content
    // bands (4.5 % / 5 = 0.9 % per gap = 4.23 px at the 340 px reference card),
    // so it is named here rather than derived in CSS — one bay, one token, and
    // #30's parity test compares seven rows instead of six plus a special case.
    // Bible ↔ token parity is #30's test; this file mirrors §8, it does not own it.
    "zone-header": value("15.5%"),
    "zone-photo": value("41.5%"),
    "zone-strip": value("5.5%"),
    "zone-story": value("19.5%"),
    "zone-stats": value("8.5%"),
    "zone-foot": value("5%"),
    "zone-gutters": value("4.5%"),
    "photo-anchor": value("center 42%"),
    "photo-focus-x": value("50%"),
    "photo-focus-y": value("42%"),
    "card-root": value("4cqw"),
    "glitter-size": value("10em 7.5em"),
    "glitter-mask-stop": value("70%"),
    "glint-from": value("-35%"),
    "glint-to": value("35%"),
  },

  aspectRatios: {
    card: value("0.7"),
    window: value("4 / 5"),
  },

  radii: {
    md: value("16px"),
    lg: value("24px"),
    plate: value("12px"),
    pill: value("999px"),
  },

  borderWidths: {
    hairline: value("1px"),
    focus: value("2px"),
  },

  blurs: {
    veil: value("12px"),
  },

  /**
   * Deliberately empty, and load-bearing. The card's only shadow is now
   * `--elsa-card-shadow` (#89, em-scaled with the rest of the card), and this
   * key *replaces* the preset shadow scale rather than merging into it —
   * deleting the key re-emits `preset-panda`'s nine-step shadow ladder into the
   * bundle (measured: +596 B). Keep it as an empty tombstone.
   */
  shadows: {},

  gradients: {
    "foil-pearl": value(
      "linear-gradient(112deg, #f1d7b4 0%, #e6c5d3 22%, #d5c8ef 43%, #eee0d2 61%, #f0d9b6 80%, #d6c6e9 100%)",
    ),
    "foil-pastel": value(
      "linear-gradient(112deg, #ffc4e6 0%, #ffe3b3 25%, #c2ffe4 50%, #b8e6ff 75%, #d6c4ff 100%)",
    ),
    "foil-spectrum": value(
      "linear-gradient(112deg, #ff6dbd 0%, #ffd35b 20%, #86edbd 40%, #67d7ff 60%, #ad8aff 80%, #ff6dbd 100%)",
    ),
    "plate-header": value(
      "linear-gradient(180deg, var(--elsa-colors-plate-header-from), var(--elsa-colors-plate-header-to))",
    ),
    "plate-body": value(
      "linear-gradient(180deg, var(--elsa-colors-plate-body-from), var(--elsa-colors-plate-body-to))",
    ),
    "foil-rise": value("linear-gradient(180deg, transparent, rgb(0 0 0 / 28%))"),
    glint: value(
      "linear-gradient(115deg, transparent 44%, rgb(255 255 255 / 55%) 50%, transparent 56%)",
    ),
  },
});

/**
 * The card em family — one root scale for everything inside the card (#89).
 *
 * Authority: `design/art/art-bible.md` §8 "Card anatomy — refactor spec"
 * ("one root em scale … express **all** card-internal dimensions … in `em`")
 * and §8 "Type & spacing scales". Adopted by `design/ux/card-detail.md` §5.3 E.
 *
 * Every value is the old px step ÷ **13.6**, which is `4cqw` of the 340 px
 * reference card (`sizes.card-max`, aspect 0.70). So the ratified 340 px look
 * is unchanged to well under a pixel, and at 180 px or 148 px the card is the
 * same drawing at a smaller scale — the mechanism that makes the headless band
 * percentages safe at any width.
 *
 * Published as `--elsa-card-*` rather than through a Panda token group for two
 * reasons: these are *one* scale (Panda would split them across `sizes`,
 * `fontSizes`, `radii`, `borderWidths` and `shadows`), and they **replace** the
 * px tokens the card used to consume instead of sitting beside them — the
 * refactor deletes the px entries below rather than adding a parallel system.
 *
 * The em is resolved against the element's own font-size, so the component
 * keeps every box at the root step and gives type to leaf elements only. See
 * `CardFace.svelte` for the two rules that follow from that.
 */
export const cardScale = {
  /** 4 px — plate gaps, chip padding, story row gap. */
  "space-1": "0.294em",
  /** 8 px — band padding, the card face's own padding, flex gaps. */
  "space-2": "0.588em",
  /** 12 px — the printed frame's inset. */
  "space-3": "0.882em",
  /** 32 px — the printed crest's diameter. */
  "space-6": "2.353em",
  /** 11 px — the small print: number, mood, edition, serial, label, star. */
  "text-sm": "0.809em",
  /** 13 px — the sentence and the stat values. */
  "text-md": "0.956em",
  /** 19 px — the card's name. */
  "text-xl": "1.397em",
  /** 1 px — the card's hairline rule. */
  rule: "0.074em",
  /** 18 px — the card's outer radius. */
  radius: "1.324em",
  /** 8 px — inner radius: the stat chips. */
  "radius-inner": "0.588em",
  /** 8 px — the photo window. */
  "radius-photo": "0.588em",
  /** 999 px — chips and the printed crest. */
  "radius-pill": "73.456em",
  /** 24 px / 60 px of old, so a 148 px card does not wear a 60 px halo. */
  shadow: "0 1.765em 4.412em rgb(0 0 0 / 48%), inset 0 0.074em rgb(255 255 255 / 8%)",
} as const;

/** The exact custom-property payload, merged into `globalCss[":root"]`. */
export const cardCssVars = Object.fromEntries(
  Object.entries(cardScale).map(([name, value]) => [`--elsa-card-${name}`, value]),
) as Record<`--elsa-card-${keyof typeof cardScale}`, string>;

/**
 * Declared usage pairs. The gate enumerates exactly this list — a token without
 * a pair is not silently trusted, and a pair without a token is a type error
 * once the shapes drift.
 */
const buildingSurfaces = [
  { name: "bg", value: palette.bg },
  { name: "bg-raised", value: palette.bgRaised },
  { name: "surface", value: palette.surface },
  { name: "surface-light", value: palette.surfaceLight },
] as const;

export const contrastPairs: readonly ContrastPair[] = [
  // The empty star slot is a meaningful UI element (the strip is a five-slot scale),
  // so it is held to 3:1 rather than the decorative line token's 28 %.
  {
    id: "star-empty-on-plate",
    fg: palette.starEmpty,
    // The strip sits on the plate gradient's lightest stop, not the flat surface;
    // measuring against the darker surface would over-report by ~0.04.
    bg: palette.plateBodyFrom,
    minimum: 3,
    role: "ui" as const,
    note: "--star-empty on the card plate",
  },
  // Building text on every structural surface it can sit on.
  ...buildingSurfaces.flatMap(({ name, value: bg }) => [
    {
      id: `ink-on-${name}`,
      fg: palette.ink,
      bg,
      minimum: 4.5,
      role: "text" as const,
      note: `--ink on --${name}`,
    },
    {
      id: `muted-on-${name}`,
      fg: palette.muted,
      bg,
      minimum: 4.5,
      role: "text" as const,
      note: `--muted on --${name}`,
    },
    {
      id: `quiet-on-${name}`,
      fg: palette.quiet,
      bg,
      minimum: 4.5,
      role: "text" as const,
      note: `raised --quiet on --${name}`,
    },
    {
      id: `metal-on-${name}`,
      fg: palette.metal,
      bg,
      minimum: 4.5,
      role: "text" as const,
      note: `--metal eyebrow on --${name}`,
    },
    {
      id: `accent-on-${name}`,
      fg: palette.accent,
      bg,
      minimum: 4.5,
      role: "text" as const,
      note: `--accent on --${name}`,
    },
    {
      id: `accent-bright-on-${name}`,
      fg: palette.accentBright,
      bg,
      minimum: 4.5,
      role: "text" as const,
      note: `--accent-bright on --${name}`,
    },
    {
      id: `metal-dark-border-on-${name}`,
      fg: palette.metalDark,
      bg,
      minimum: 3,
      role: "ui" as const,
      note: `--metal-dark is a non-text brass rule; 3:1 UI floor on --${name}`,
    },
  ]),

  // Card header plate (lightest stop #2c2636) and body plate (lightest #25212d).
  { id: "print-ink-on-paper", fg: palette.printInk, bg: palette.printPaper, minimum: 7, role: "text" },
  { id: "print-name-on-header", fg: palette.printName, bg: palette.plateHeaderFrom, minimum: 4.5, role: "text" },
  { id: "print-number-on-header", fg: palette.printNumber, bg: palette.plateHeaderFrom, minimum: 4.5, role: "text" },
  { id: "print-mood-on-header", fg: palette.printMood, bg: palette.plateHeaderFrom, minimum: 4.5, role: "text" },
  { id: "print-rarity-on-header", fg: palette.printRarity, bg: palette.plateHeaderFrom, minimum: 4.5, role: "text" },
  { id: "print-keyword-on-body", fg: palette.printKeyword, bg: palette.plateBodyFrom, minimum: 4.5, role: "text" },
  { id: "print-copy-on-body", fg: palette.printCopy, bg: palette.plateBodyFrom, minimum: 4.5, role: "text" },
  { id: "print-line-on-body", fg: palette.printLine, bg: palette.plateBodyFrom, minimum: 4.5, role: "text" },
  { id: "print-stat-key-on-body", fg: palette.printStatKey, bg: palette.plateBodyFrom, minimum: 4.5, role: "text" },
  { id: "print-stat-value-on-body", fg: palette.printStatValue, bg: palette.plateBodyFrom, minimum: 4.5, role: "text" },
  { id: "print-serial-on-body", fg: palette.printSerial, bg: palette.plateBodyFrom, minimum: 4.5, role: "text" },
  { id: "print-credit-on-body", fg: palette.printCredit, bg: palette.plateBodyFrom, minimum: 4.5, role: "text" },
  { id: "print-stats-label-on-body", fg: palette.printStatsLabel, bg: palette.plateBodyFrom, minimum: 4.5, role: "text" },
  { id: "print-kind-on-body", fg: palette.printKind, bg: palette.plateBodyFrom, minimum: 4.5, role: "text" },

  // Chip text sits on the lightest foil stops (the hardest case for a dark ink).
  { id: "chip-text-on-foil-pearl", fg: palette.chipText, bg: "#eee0d2", minimum: 4.5, role: "text", note: "lightest pearl stop" },
  { id: "chip-text-on-holo-yellow", fg: palette.chipText, bg: "#ffd35b", minimum: 4.5, role: "text", note: "the holo chip's lightest stop" },

  // Focus ring must remain a 3:1 non-text indicator on the room and raised glass.
  { id: "focus-ring-on-bg", fg: palette.accentBright, bg: palette.bg, minimum: 3, role: "border" },
  { id: "focus-ring-on-surface-light", fg: palette.accentBright, bg: palette.surfaceLight, minimum: 3, role: "border" },
] satisfies ContrastPair[];

/**
 * Empty by design. Every exemption must name the WCAG clause and a reason; the
 * gate fails if an exemption is declared without one (test U-CON-06).
 */
export const contrastExemptions: readonly {
  readonly id: string;
  readonly clause: string;
  readonly reason: string;
}[] = [];

export type { ContrastPair };
export { motionCssVars };