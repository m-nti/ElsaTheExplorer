/**
 * Reads `CardFace.svelte` as text for the structural unit tests (T5, T6).
 *
 * Why source and not a rendered DOM: these assertions are about the component's
 * *contract* — which named layers exist, which token a declaration consumes,
 * whether a band still pads itself — and the unit project runs in `node` with no
 * DOM. The rendered slice (overflow at five widths, focus, reduced motion) is
 * T9's Playwright spec; this module holds the cheap invariants that must fail in
 * a sub-second unit run instead.
 *
 * The readers are deliberately small and layout-aware: `cssRules` keeps the
 * enclosing at-rule path (so a `@media` override is never mistaken for the base
 * rule), and `classDepths` counts element depth (so "glint is a child of the
 * glitter layer" is a nesting fact, not a substring coincidence).
 */
import { readFileSync } from "node:fs";

/** Repo-relative path of the component under test. */
export const CARD_FACE_PATH = "src/lib/components/CardFace.svelte";

/** The component's source text, read from the repo root. */
export function readCardFace(): string {
  return readFileSync(new URL(`../../../${CARD_FACE_PATH}`, import.meta.url), "utf8");
}

/** The markup half of the SFC: after `</script>`, before `<style>`. */
export function markupOf(source: string): string {
  const scriptEnd = source.indexOf("</script>");
  const afterScript = scriptEnd === -1 ? source : source.slice(scriptEnd + "</script>".length);
  const styleAt = afterScript.indexOf("<style");
  return styleAt === -1 ? afterScript : afterScript.slice(0, styleAt);
}

/** The scoped-CSS half of the SFC: between `<style>` and `</style>`. */
export function styleOf(source: string): string {
  const open = source.indexOf("<style>");
  const close = source.lastIndexOf("</style>");
  if (open === -1 || close === -1) return "";
  return source.slice(open + "<style>".length, close);
}

export interface CssDeclaration {
  readonly property: string;
  readonly value: string;
}

export interface CssRule {
  readonly selectors: readonly string[];
  readonly declarations: readonly CssDeclaration[];
  /** Enclosing at-rules, outermost first (`@media …`, `@container …`). */
  readonly atRules: readonly string[];
}

/** Index of the `}` that closes the `{` at `open`. */
function closingBrace(css: string, open: number): number {
  let depth = 0;
  for (let index = open; index < css.length; index += 1) {
    const char = css[index];
    if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return css.length;
}

function declarationsOf(body: string): CssDeclaration[] {
  const found: CssDeclaration[] = [];
  for (const chunk of body.split(";")) {
    const at = chunk.indexOf(":");
    if (at === -1) continue;
    const property = chunk.slice(0, at).trim();
    const value = chunk.slice(at + 1).trim();
    if (property && value) found.push({ property, value });
  }
  return found;
}

/**
 * Every style rule in a stylesheet, with its selector list, declarations and
 * at-rule path. Comments are stripped first so a commented-out declaration can
 * never satisfy a test.
 */
export function cssRules(css: string): CssRule[] {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const rules: CssRule[] = [];
  const atRules: string[] = [];
  let buffer = "";

  for (let index = 0; index < clean.length; index += 1) {
    const char = clean[index];
    if (char === "{") {
      const head = buffer.trim();
      buffer = "";
      if (head.startsWith("@")) {
        atRules.push(head);
        continue;
      }
      const end = closingBrace(clean, index);
      rules.push({
        selectors: head
          .split(",")
          .map((selector) => selector.trim())
          .filter(Boolean),
        declarations: declarationsOf(clean.slice(index + 1, end)),
        atRules: [...atRules],
      });
      index = end;
      continue;
    }
    if (char === "}") {
      atRules.pop();
      buffer = "";
      continue;
    }
    buffer += char;
  }

  return rules;
}

/**
 * Element depth of every statically named class in a markup fragment.
 * Depth 0 is a root element; a child of a root element is depth 1.
 */
export function classDepths(markup: string): Map<string, number> {
  const depths = new Map<string, number>();
  const tag = /<(\/?)([a-zA-Z][\w:-]*)([^>]*)>/g;
  let depth = 0;
  let match: RegExpExecArray | null;

  while ((match = tag.exec(markup)) !== null) {
    const closing = match[1] === "/";
    const attrs = match[3] ?? "";
    if (closing) {
      depth = Math.max(0, depth - 1);
      continue;
    }
    const classAttr = /class="([^"]*)"/.exec(attrs);
    if (classAttr) {
      for (const name of (classAttr[1] ?? "").split(/\s+/)) {
        // `{rarityClass}` and friends are runtime expressions, not class names.
        if (name && !name.startsWith("{")) depths.set(name, depth);
      }
    }
    if (!attrs.trimEnd().endsWith("/")) depth += 1;
  }

  return depths;
}
