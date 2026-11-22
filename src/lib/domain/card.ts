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
  /** Star count in the strip: the second non-colour rarity backup. */
  readonly stars: 0 | 1 | 2 | 3;
  readonly edition: string;
  readonly keyword: string;
  readonly story: string;
  readonly printLine: string;
  readonly stats: readonly CardStat[];
  readonly serial: string;
  readonly credit: string;
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
  /** Per-photo crop anchor; defaults to the archive's reading line, center 42%. */
  readonly focus?: string;
}
