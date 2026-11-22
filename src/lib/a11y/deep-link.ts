/**
 * `?photo=` deep links (card-detail §4, #28).
 *
 * The app has no router: the URL param is the whole navigation surface. An id
 * that is not in the collection opens nothing — a mistyped link is not an
 * error state — and closing a card removes the param without losing the
 * language choice.
 */

export const PHOTO_PARAM = "photo";

/** The requested photo id, or `null` when absent/blank. */
export function readPhotoParam(search: string): string | null {
  const value = new URLSearchParams(search).get(PHOTO_PARAM)?.trim() ?? "";
  return value.length > 0 ? value : null;
}

/** Build a search string with `photo` set (or removed), preserving other params. */
export function withPhotoParam(search: string, photoId: string | null): string {
  const params = new URLSearchParams(search);
  if (photoId) {
    params.set(PHOTO_PARAM, photoId);
  } else {
    params.delete(PHOTO_PARAM);
  }
  const next = params.toString();
  return next.length > 0 ? `?${next}` : "";
}

/** Resolve the linked card, or `null` when the id is unknown. */
export function resolveDeepLink<T extends { readonly id: string }>(
  photoId: string | null,
  cards: readonly T[],
): T | null {
  if (!photoId) return null;
  return cards.find((card) => card.id === photoId) ?? null;
}
