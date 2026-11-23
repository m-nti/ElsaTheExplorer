/**
 * How the photo band is drawn (#13, T8).
 *
 * `CardFaceModel.renderable` is the manifest flag (`ADR-0004`): `false` means
 * the archive holds no photographic derivative for this card, so the face
 * renders the **printed frame** and must request **no image at all**
 * (three source docs agree: the field's own comment in `src/lib/domain/card.ts`
 * and #13's acceptance criteria; the assertion is E-IMG-09).
 *
 * `absent` is renderable, on purpose: every card written before the field
 * existed keeps its photograph, and a manifest that omits the flag is not a
 * claim that the photo is missing.
 */

/** The one decision the photo band branches on. */
export type RenderMode = "image" | "printed";

/** The narrow input: any object that carries the flag, present or not. */
export interface Renderable {
  readonly renderable?: boolean;
}

/** `printed` only for an explicit `false`; everything else keeps its image. */
export function renderMode(model: Renderable): RenderMode {
  return model.renderable === false ? "printed" : "image";
}
