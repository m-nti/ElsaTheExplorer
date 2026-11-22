/**
 * Persistence adapter — the only module that touches `Storage` (architecture
 * layer rule: no component, store or domain module imports `localStorage`).
 *
 * Scope for #27 is the reset half of ADR-0003: the namespace sweep and the
 * availability probe. `read` / `write` / `migrate` arrive with the persistence
 * phase; they are deliberately absent rather than dead code.
 *
 * Wipe semantics (ADR-0003 §5): enumerate every key carrying the `lucky-elsa.`
 * prefix — legacy and unknown keys included — then remove them. An allowlist
 * would leave a stale build's leftovers behind on a shared device, which is the
 * exact state a reset exists to remove.
 */

export const STORAGE_PREFIX = "lucky-elsa.";

/** The four `Storage` members this module needs; a fake satisfies it in tests. */
export interface StorageLike {
  readonly length: number;
  key(index: number): string | null;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** An inaccessible `localStorage` (privacy mode, sandbox) throws on the getter. */
function resolveDefaultStorage(): StorageLike | null {
  // `typeof window` first: Node 26 exposes a `localStorage` global that warns
  // on touch unless `--localstorage-file` is set, and no unit test should trip it.
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage as StorageLike;
  } catch {
    return null;
  }
}

export class PersistenceStore {
  #backend: StorageLike | null | undefined;
  #available: boolean | undefined;

  /** `undefined` resolves the page's `localStorage` lazily; `null` is "none". */
  constructor(backend?: StorageLike | null) {
    if (backend !== undefined) this.#backend = backend;
  }

  /**
   * Whether a write can land. Probed once per session: a private-mode browser
   * reports `true` for `localStorage` and throws on the first write, so the only
   * honest test is a set/remove pair. A later failure must not flip a session
   * that already demonstrated working storage.
   */
  get available(): boolean {
    this.#available ??= this.#probe();
    return this.#available;
  }

  /**
   * Remove every `lucky-elsa.*` key. Returns how many removals succeeded.
   * Never throws: a refusing key must not stop the rest of the reset, and the
   * app must keep running with storage unavailable (ADR-0003 §3).
   */
  wipe(): number {
    const backend = this.#storage();
    if (backend === null) return 0;

    const keys: string[] = [];
    try {
      for (let index = 0; index < backend.length; index += 1) {
        const key = backend.key(index);
        if (key !== null && key.startsWith(STORAGE_PREFIX)) keys.push(key);
      }
    } catch {
      return 0;
    }

    // Collected first: `removeItem` shifts `key(index)`, so iterating while
    // removing skips every other entry.
    let removed = 0;
    for (const key of keys) {
      try {
        backend.removeItem(key);
        removed += 1;
      } catch {
        // One hostile key is not a reason to leave the collection in place.
      }
    }
    return removed;
  }

  #storage(): StorageLike | null {
    this.#backend ??= resolveDefaultStorage();
    return this.#backend;
  }

  #probe(): boolean {
    const backend = this.#storage();
    if (backend === null) return false;
    const probe = `${STORAGE_PREFIX}probe.v1`;
    try {
      backend.setItem(probe, "1");
      backend.removeItem(probe);
      return true;
    } catch {
      return false;
    }
  }
}

export const persistence = new PersistenceStore();
