/**
 * Rarity is a domain concept: a card's tier is derived (or overridden) before
 * it reaches the view layer. The typed tier table in `design/tokens/tokens.ts`
 * uses this union as its exhaustiveness key, so adding a tier is a compile-time
 * change in the domain, not a CSS edit.
 */

export const RARITY_TIERS = ["common", "rare", "holo"] as const;

export type RarityTier = (typeof RARITY_TIERS)[number];
