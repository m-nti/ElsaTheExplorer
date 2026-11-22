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
