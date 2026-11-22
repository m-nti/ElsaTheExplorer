import { defineConfig } from "@pandacss/dev";
import { motionCssVars, rarityRecipe, tokens } from "./design/tokens/tokens";

export default defineConfig({
  // Presets stay explicit: base gives the utility conditions, panda gives the
  // default token scales. Our theme layer extends, never silently replaces them.
  presets: ["@pandacss/preset-base", "@pandacss/preset-panda"],
  preflight: true,

  include: ["./src/**/*.{ts,svelte}"],
  exclude: ["./legacy/**", "./node_modules/**", "./dist/**", "./styled-system/**"],

  outdir: "styled-system",

  /**
   * `--elsa-*` is the published token namespace (ADR-0002). Panda prefixes
   * both the custom properties and the generated artifact classes.
   */
  prefix: "elsa",
  cssVarRoot: ":root",

  layers: {
    reset: "reset",
    base: "base",
    tokens: "tokens",
    recipes: "recipes",
    utilities: "utilities",
  },

  theme: {
    tokens,
    recipes: {
      rarity: rarityRecipe,
    },
  },

  globalFontface: {
    Chivo: {
      src: 'url("/fonts/chivo-latin.woff2") format("woff2")',
      fontStyle: "normal",
      fontWeight: "400 700",
      fontDisplay: "swap",
    },
    Ultra: {
      src: 'url("/fonts/ultra-latin.woff2") format("woff2")',
      fontStyle: "normal",
      fontWeight: "400",
      fontDisplay: "swap",
    },
    /**
     * The metric-matched interim face for Ultra (#26). `swap` is the art-bible
     * rule, so the wordmark changes face after first paint; without a face whose
     * width and vertical metrics already match Ultra, that swap moves the block
     * (measured CLS 0.0075-0.0080). Ratios come from measured advances at
     * 100 px: Ultra 1070.75 / Georgia 762.60 = 140.41 %, ascent 101 %, descent
     * 27 %, no line gap. A local serif is the fallback of the fallback.
     */
    "Ultra Fallback": {
      src: 'local("Georgia"), local("Times New Roman")',
      fontStyle: "normal",
      fontWeight: "400",
      fontDisplay: "swap",
      sizeAdjust: "140.41%",
      ascentOverride: "71.9%",
      descentOverride: "19.2%",
      lineGapOverride: "0%",
    },
    /**
     * The metric-matched interim face for Chivo (#81). `swap` is the art-bible
     * rule, so body text changes face after first paint; without a face whose
     * advances and vertical metrics already match Chivo, that swap moves the
     * tagline and the eyebrow 1 px (measured CLS 0.000565 at 390 x 844 DPR 2).
     * Advance ratio from measured widths at 100 px: Chivo 3268.149 / Arial
     * 3095.654 = 105.57 %. Chivo's hhea is 940 / -250 at 1000 upem with no line
     * gap (94 % / 25 %); the overrides are relative to the adjusted em, so both
     * are divided by 1.0557. Arial is metric-compatible with Liberation Sans,
     * which is what the same `local()` resolves to on Linux.
     */
    "Chivo Fallback": {
      src: 'local("Arial"), local("Liberation Sans")',
      fontStyle: "normal",
      fontWeight: "400 700",
      fontDisplay: "swap",
      sizeAdjust: "105.57%",
      ascentOverride: "89.04%",
      descentOverride: "23.68%",
      lineGapOverride: "0%",
    },
    /**
     * The interim face for tracked uppercase labels (#81). A single size-adjust
     * cannot serve both cases: Chivo's sentence copy is 5.6 % wider than Arial's,
     * its uppercase 3.3 % narrower, and the eyebrow is centred — the centred line
     * moves by half the advance change (measured 7.95 px with `Chivo Fallback`
     * alone, CLS 0.000121). This face matches the rendered eyebrow (11 px, 600,
     * 0.14 em tracking): Chivo 212.97 / Arial 220.15 = 96.72 %. Same hhea
     * division as the body face.
     */
    "Chivo Label Fallback": {
      src: 'local("Arial"), local("Liberation Sans")',
      fontStyle: "normal",
      fontWeight: "400 700",
      fontDisplay: "swap",
      sizeAdjust: "96.72%",
      ascentOverride: "97.19%",
      descentOverride: "25.85%",
      lineGapOverride: "0%",
    },
  },

  globalCss: {
    ":root": {
      ...motionCssVars,
    },
  },

  /**
   * All tier variants are safelisted: a rarity must render correctly even when
   * only one card is on screen, and the static artifact is the delivery form.
   * The token gate (`contrastPairs`) is the only place usage is declared.
   */
  staticCss: {
    recipes: {
      rarity: [{ rarity: ["common", "rare", "holo"] }],
    },
  },
});
