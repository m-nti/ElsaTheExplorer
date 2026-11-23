/**
 * The printed frame for `renderable:false` (#13, T8).
 *
 * Authority: `src/lib/domain/card.ts:26-30` (`renderable` is "`false` renders
 * the printed frame and requests no image (manifest `renderable`, ADR-0004);
 * absent is treated as renderable"), `design/ux/card-detail.md` §6 ("Image
 * error … the card remains readable without the picture") and §12's rule that
 * decoration never becomes a second voice.
 *
 * The pure function is pinned here; the *no request* half is E-IMG-09 in
 * `tests/e2e/cardface.slice.spec.ts`, because "no request" is a network fact
 * and a source assertion cannot prove it. What this file can prove is that the
 * branch exists and that the printed frame has no image-bearing declaration of
 * its own (no `<img>`, no CSS `url(`) — the two ways a request could still
 * escape.
 */
import { describe, expect, it } from "vitest";
import { renderMode } from "$lib/domain/render-mode";
import { markupOf, readCardFace, styleOf } from "./support/cardface-source";

describe("render mode (#13, T8)", () => {
  it("prints the frame when the manifest says the card is not renderable", () => {
    expect(renderMode({ renderable: false })).toBe("printed");
  });

  it("images the frame when renderable is true", () => {
    expect(renderMode({ renderable: true })).toBe("image");
  });

  it("treats an absent flag as renderable — the manifest's default", () => {
    expect(renderMode({})).toBe("image");
  });
});

describe("CardFace printed frame (#13, T8)", () => {
  const source = readCardFace();
  const markup = markupOf(source);

  it("branches the photo band on the mode", () => {
    expect(source).toContain('renderMode(model)');
    expect(markup).toContain('{#if mode === "printed"}');
    expect(markup).toContain("data-render={mode}");
  });

  it("requests no image in the printed branch", () => {
    const start = markup.indexOf('{#if mode === "printed"}');
    const elseAt = markup.indexOf("{:else}", start);
    expect(start).toBeGreaterThan(-1);
    expect(elseAt).toBeGreaterThan(start);

    const printedBranch = markup.slice(start, elseAt);
    const imageBranch = markup.slice(elseAt);

    expect(printedBranch).not.toContain("<img");
    expect(printedBranch).not.toContain("model.photo.src");
    expect(printedBranch).toContain("printed-caption");
    // The image branch is untouched: the placeholder still has its photo.
    expect(imageBranch).toContain("<img");
    expect(imageBranch).toContain("model.photo.src");
  });

  it("carries the alt text as the printed frame's text, so the band is never silent", () => {
    // Decoration never becomes a second voice: the crest is aria-hidden and the
    // caption is the photo's own alt, not a new string.
    expect(markup).toContain("{model.photo.alt}");
    expect(markup).toMatch(/aria-hidden="true"[\s\S]*printed/);
  });

  it("never declares an image in CSS", () => {
    // A `url()` in the scoped stylesheet would fire a request even with no
    // `<img>` in the DOM — the second way E-IMG-09 could fail.
    expect(styleOf(source)).not.toContain("url(");
  });
});
