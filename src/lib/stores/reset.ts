/**
 * Reset orchestration — the pure half (#27).
 *
 * The order is the contract (ADR-0003 §5, ADR-0010 §3): the namespace is wiped,
 * then the in-memory stores are cleared, then preferences return to their
 * defaults, then the confirmed reset is announced once — in German, because the
 * language preference has just gone back to German. Cancel never reaches this
 * module, so "zero writes on cancel" holds by construction.
 *
 * The wiring to the live singletons is `reset.svelte.ts`; keeping this file
 * rune-free is what lets the node project assert the order.
 */

export interface ResetPorts {
  wipe(): number;
  resetCollection(): void;
  resetPreferences(): void;
  translate(key: "live.reset.done"): string;
  announce(message: string): void;
}

export interface ResetOutcome {
  readonly clearedKeys: number;
  readonly announcement: string;
}

export function performReset(ports: ResetPorts): ResetOutcome {
  const clearedKeys = ports.wipe();
  ports.resetCollection();
  ports.resetPreferences();
  // Rendered after the locale reset: an English line read on the German
  // first-visit state is the defect the deck's §8 rule forbids.
  const announcement = ports.translate("live.reset.done");
  ports.announce(announcement);
  return { clearedKeys, announcement };
}
