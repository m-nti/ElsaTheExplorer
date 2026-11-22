/**
 * Persistence wipe gate (#27).
 *
 * The reset control's whole promise is "no destructive action without a
 * confirmation" and "the confirmation clears everything". This suite owns the
 * second half: `wipe()` is a namespace sweep, not an allowlist, it is
 * idempotent, it survives a hostile key, and it reports availability instead of
 * pretending a write happened (ADR-0003 §3/§5, test-plan U-PST-13/15/16).
 *
 * The adapter is a fake: `localStorage` is not required in the node project,
 * and the real backend's only contract is the four methods below.
 */
import { describe, expect, it } from "vitest";
import { PersistenceStore, STORAGE_PREFIX, type StorageLike } from "$lib/io/persistence.svelte";

class FakeStorage implements StorageLike {
  readonly #items = new Map<string, string>();
  readonly #denied = new Set<string>();
  writes = 0;

  get length(): number {
    return this.#items.size;
  }

  key(index: number): string | null {
    return [...this.#items.keys()][index] ?? null;
  }

  getItem(key: string): string | null {
    return this.#items.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.writes += 1;
    this.#items.set(key, value);
  }

  removeItem(key: string): void {
    if (this.#denied.has(key)) throw new Error(`denied: ${key}`);
    this.#items.delete(key);
  }

  seed(entries: Readonly<Record<string, string>>): void {
    for (const [key, value] of Object.entries(entries)) this.#items.set(key, value);
  }

  denyRemoval(key: string): void {
    this.#denied.add(key);
  }

  keys(): readonly string[] {
    return [...this.#items.keys()].sort();
  }
}

describe("PersistenceStore.wipe", () => {
  it("removes every lucky-elsa.* key, registered or stale, and nothing else", () => {
    const backend = new FakeStorage();
    backend.seed({
      "lucky-elsa.lang.v2": '{"v":2,"data":"en"}',
      "lucky-elsa.sound.v2": '{"v":2,"data":false}',
      "lucky-elsa.seen.v2": '{"v":2,"data":["elsa-01"]}',
      "lucky-elsa.visits.v1": "3",
      "lucky-elsa.stale.v0": "old",
      "lucky-elsa.unknown.v9": "future",
      "lucky-elsa.probe.v1": "1",
      "another.tool.key": "keep",
      "elsa-cache-marker": "keep",
    });
    const store = new PersistenceStore(backend);

    expect(store.wipe()).toBe(7);
    expect(backend.keys()).toEqual(["another.tool.key", "elsa-cache-marker"]);
  });

  it("is idempotent", () => {
    const backend = new FakeStorage();
    backend.seed({ "lucky-elsa.seen.v2": "[]" });
    const store = new PersistenceStore(backend);

    expect(store.wipe()).toBe(1);
    expect(store.wipe()).toBe(0);
  });

  it("keeps clearing after one key refuses removal", () => {
    const backend = new FakeStorage();
    backend.seed({ "lucky-elsa.a.v1": "1", "lucky-elsa.b.v1": "2", "lucky-elsa.c.v1": "3" });
    backend.denyRemoval("lucky-elsa.b.v1");
    const store = new PersistenceStore(backend);

    expect(() => store.wipe()).not.toThrow();
    expect(store.wipe()).toBe(0);
    expect(backend.keys()).toEqual(["lucky-elsa.b.v1"]);
  });

  it("does nothing without a backend", () => {
    const store = new PersistenceStore(null);
    expect(store.wipe()).toBe(0);
    expect(store.available).toBe(false);
  });

  it("reports the namespace it sweeps", () => {
    expect(STORAGE_PREFIX).toBe("lucky-elsa.");
  });
});

describe("PersistenceStore.available", () => {
  it("is true for a working backend and leaves no probe key behind", () => {
    const backend = new FakeStorage();
    const store = new PersistenceStore(backend);

    expect(store.available).toBe(true);
    expect(backend.keys()).toEqual([]);
  });

  it("is false when the probe write throws", () => {
    const backend = new FakeStorage();
    backend.setItem = () => {
      throw new Error("QuotaExceededError");
    };
    const store = new PersistenceStore(backend);

    expect(store.available).toBe(false);
  });

  it("probes once, so a later failure does not flip a working session", () => {
    const backend = new FakeStorage();
    const store = new PersistenceStore(backend);
    expect(store.available).toBe(true);

    backend.setItem = () => {
      throw new Error("QuotaExceededError");
    };
    expect(store.available).toBe(true);
  });

  it("is false in a node environment with no localStorage", () => {
    expect(new PersistenceStore().available).toBe(false);
  });
});
