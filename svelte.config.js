import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/vite-plugin-svelte').SvelteConfig} */
export default {
  // TypeScript in `<script lang="ts">`; styles are handled by Panda + scoped CSS.
  preprocess: vitePreprocess(),

  compilerOptions: {
    // The refactor is runes-only. No implicit legacy mode anywhere.
    runes: true,
  },

  /**
   * ADR-0002 enforcement belt: Svelte's unused-CSS warning is a build error,
   * not a console note. A selector that dies in a refactor must remove its
   * declaration or be deliberately deleted.
   */
  onwarn(warning, handler) {
    if (warning.code === "css_unused_selector") {
      throw new Error(`[svelte] ${warning.code}: ${warning.message}`);
    }
    handler(warning);
  },
};
