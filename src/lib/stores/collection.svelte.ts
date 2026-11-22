import { SvelteSet } from "svelte/reactivity";
import type { RarityTier } from "$lib/domain/rarity";

/**
 * Collection store — in-memory for B1. Persistence (`lucky-elsa.*`,
 * ADR-0003) attaches in the persistence phase; this store never touches
 * `localStorage` itself and must not grow a storage adapter.
 *
 * `seen` is a reactive Set; Svelte 5 instruments Set mutations, so `add` is
 * enough and callers do not need to reassign.
 */
export interface CollectionEntry {
  readonly id: string;
  readonly rarity: RarityTier;
  readonly seenAt: string;
}

export interface CollectionSnapshot {
  readonly seen: ReadonlySet<string>;
  readonly total: number;
}

export class CollectionStore {
  #seen = new SvelteSet<string>();
  #total = $state(0);

  get seen(): ReadonlySet<string> {
    return this.#seen;
  }

  get total(): number {
    return this.#total;
  }

  get count(): number {
    return this.#seen.size;
  }

  /** 0–1; a display concern (the format lives in the view layer). */
  get progress(): number {
    if (this.#total <= 0) return 0;
    return this.#seen.size / this.#total;
  }

  get complete(): boolean {
    return this.#total > 0 && this.#seen.size >= this.#total;
  }

  has(id: string): boolean {
    return this.#seen.has(id);
  }

  /** Returns true when the id was new (the caller may announce it). */
  markSeen(id: string): boolean {
    if (this.#seen.has(id)) return false;
    this.#seen.add(id);
    return true;
  }

  setTotal(total: number): void {
    if (!Number.isInteger(total) || total < 0) {
      throw new RangeError(`Collection total must be a non-negative integer, got ${total}`);
    }
    this.#total = total;
  }

  hydrate(ids: Iterable<string>, total: number): void {
    this.setTotal(total);
    this.#seen = new SvelteSet(ids);
  }

  reset(): void {
    this.#seen = new SvelteSet();
    this.#total = 0;
  }

  snapshot(): CollectionSnapshot {
    // Defensive plain copy: a snapshot must not stay live with the store.
    // eslint-disable-next-line svelte/prefer-svelte-reactivity
    return { seen: new Set(this.#seen), total: this.#total };
  }
}

export const collection = new CollectionStore();
