import type { StarCount } from "./card-stars";
import type { FocusPoint } from "./card-photo";
import type { RarityTier } from "./rarity";

/** The card face's fixed zone content. Mirrors `CardFace.svelte`'s zone order. */
export interface CardFaceModel {
  readonly id: string;
  readonly number: string;
  readonly name: string;
  readonly mood: string;
  readonly rarity: RarityTier;
  /** Visible chip text: the non-colour rarity backup (Häufig / Selten / Holo-Pracht). */
  readonly rarityLabel: string;
  /**
   * Filled slots in the strip: the second non-colour rarity backup. Fill it with
   * `cardStars(rarity)` — the scale is 3 / 4 / 5 of five, never a tier index.
   */
  readonly stars: StarCount;
  readonly edition: string;
  readonly keyword: string;
  readonly story: string;
  readonly printLine: string;
  readonly stats: readonly CardStat[];
  readonly serial: string;
  readonly credit: string;
  /**
   * `false` renders the printed frame and requests no image (manifest
   * `renderable`, ADR-0004). Absent is treated as renderable.
   */
  readonly renderable?: boolean;
  readonly photo: CardPhoto;
}

export interface CardStat {
  readonly label: string;
  readonly value: string;
}

export interface CardPhoto {
  /** A bounded derivative URL — never a `photos/<original>` path. */
  readonly src: string;
  readonly alt: string;
  /** Intrinsic dimensions of the derivative; keeps CLS at zero. */
  readonly width: number;
  readonly height: number;
  /** Per-photo crop anchor in 0..1; defaults to the archive's reading line, center 42%. */
  readonly focus?: FocusPoint;
}
