/**
 * The one reader of the OS motion preference (ADR-0010 §4).
 *
 * Exactly one `matchMedia('(prefers-reduced-motion: reduce)')` call exists in
 * `src/`, and it is here. Components consume `motion.reduce`; they never ask
 * the browser themselves. CSS keeps its own media query — two readers of one OS
 * fact, never two sources — so the store must not write a class or a `data-`
 * attribute that drives CSS (that would make JS the source for CSS and
 * re-introduce the first-paint flash the ADR removes).
 *
 * Guarded for absence: the Vitest node project has no `matchMedia`, and a
 * module-level store is imported by the page shell.
 */
export class MotionStore {
  /** `true` when the visitor asked the OS for reduced motion. Live-updated. */
  reduce = $state(false);

  constructor() {
    if (typeof matchMedia !== "function") return;
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    this.reduce = query.matches;
    query.addEventListener("change", (event) => {
      this.reduce = event.matches;
    });
  }
}

export const motion = new MotionStore();
