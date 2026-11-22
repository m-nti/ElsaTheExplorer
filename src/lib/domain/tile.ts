import type { CardPhoto } from "./card";

/**
 * The binder tile's text alternative (#28, a11y-baseline M6).
 *
 * The photograph is the content, not decoration: the manifest's own
 * description is the alternative, and the printed card name is the fallback
 * when the manifest cannot supply one. An empty alt is the defect this exists
 * to prevent, so a whitespace-only value is treated as missing.
 */
export function tileAlt(photo: Pick<CardPhoto, "alt">, fallbackName: string): string {
  const fromManifest = photo.alt.trim();
  if (fromManifest.length > 0) return fromManifest;
  return fallbackName.trim();
}
