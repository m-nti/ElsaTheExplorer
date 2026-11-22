import { defineConfig } from "@pandacss/dev";
import { cardCssVars, motionCssVars, rarityRecipe, tokens } from "./design/tokens/tokens";

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
  },

  globalCss: {
    ":root": {
      ...motionCssVars,
      // The card's one root em scale (#89): published here, beside the motion
      // names, because it is a scale rather than four Panda token groups.
      ...cardCssVars,
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
