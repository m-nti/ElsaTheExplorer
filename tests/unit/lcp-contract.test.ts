/**
 * LCP shell contract (#26) — one URL per picture.
 *
 * The pre-refactor app fetched the same picture twice: `index.html` shipped
 * `photos/thumbs/elsa-01.jpg` (111,920 B) and `app.js` then repointed that
 * element at `photos.php?thumb=…` (62,248 B) — 174,168 B on the critical path
 * for one image. v2 removed both halves by construction, but "by construction"
 * is not a gate, and the surface that can reintroduce the defect (a preload
 * emitted for a URL the app then renders differently) is one commit away.
 *
 * This file pins the two invariants that make the duplicate impossible:
 *
 * 1. A preload is only legal for a URL the app itself renders. A preload the
 *    app never renders is a second request for something the reader cannot see.
 * 2. The shell may not ship an image that the app rewrites afterwards. One
 *    element, one URL, decided once.
 *
 * The negative proof is the legacy pair itself — the gate is run against
 * `legacy/index.html` and `legacy/assets/js/app.js`, the exact markup that cost
 * 174 KB, so a green run cannot be a green run over nothing. The runtime half
 * of the same contract (`E-DLV-09` dims, `E-DLV-10` one request per element,
 * CLS 0) is `tests/e2e/lcp.spec.ts`.
 */
import { globSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

interface AppSource {
  readonly path: string;
  readonly text: string;
}

type Rule = "image-preload-not-rendered" | "max-one-image-preload" | "shell-image-rewritten";

interface Violation {
  readonly rule: Rule;
  readonly detail: string;
}

function read(relativePath: string): string {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

function appSources(): AppSource[] {
  return globSync("src/**/*.{svelte,ts}").map((path) => ({ path, text: read(path) }));
}

/** Every `<name …>` tag in the document, attribute values allowed to hold `>` if quoted. */
function tags(html: string, name: string): string[] {
  const pattern = new RegExp(`<${name}\\b((?:[^>"']|"[^"]*"|'[^']*')*)>`, "gi");
  return [...html.matchAll(pattern)].map((match) => match[1] ?? "");
}

function attributes(tag: string): Map<string, string> {
  const found = new Map<string, string>();
  const pattern = /([a-zA-Z-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
  for (const match of tag.matchAll(pattern)) {
    const name = match[1];
    if (!name) continue;
    found.set(name.toLowerCase(), match[2] ?? match[3] ?? match[4] ?? "");
  }
  return found;
}

function escape(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** A shell URL as the app would write it: path plus query, entity-decoded. */
function urlKey(href: string): string {
  const decoded = href.replace(/&amp;/g, "&");
  const withoutOrigin = decoded.replace(/^https?:\/\/[^/]+/i, "");
  return withoutOrigin;
}

/**
 * Is this shell element's `src` assigned anywhere in the app?
 *
 * Both shapes are caught because both existed: a direct
 * `getElementById("id").src = …`, and the legacy alias —
 * `els.packPreview = document.getElementById("pack-preview")` followed by
 * `els.packPreview.src = cover.thumb`.
 */
function isRewritten(id: string, sources: readonly AppSource[]): boolean {
  const quotedId = `["'\`]#?${escape(id)}["'\`]`;
  const directAssignment = new RegExp(
    `(?:getElementById|querySelector)\\(\\s*${quotedId}\\s*\\)\\s*\\.\\s*(?:src|setAttribute\\(\\s*["']src["'])`,
  );
  const alias = new RegExp(
    `([A-Za-z_$][\\w$]*(?:\\.[A-Za-z_$][\\w$]*)*)\\s*=\\s*document\\.(?:getElementById|querySelector)\\(\\s*${quotedId}\\s*\\)`,
    "g",
  );

  return sources.some(({ text }) => {
    if (directAssignment.test(text)) return true;
    for (const match of text.matchAll(alias)) {
      const reference = match[1];
      if (!reference) continue;
      const used = new RegExp(
        `(?:^|[^\\w$.])${escape(reference)}\\s*\\.\\s*(?:src|setAttribute\\(\\s*["']src["'])`,
        "m",
      );
      if (used.test(text)) return true;
    }
    return false;
  });
}

function auditLcpShell(input: {
  readonly shellHtml: string;
  readonly appSources: readonly AppSource[];
}): Violation[] {
  const violations: Violation[] = [];
  const rendered = input.appSources.map((source) => source.text).join("\n");

  const preloads = tags(input.shellHtml, "link")
    .map(attributes)
    .filter((attrs) => (attrs.get("rel") ?? "").split(/\s+/).includes("preload") && attrs.get("as") === "image");

  if (preloads.length > 1) {
    violations.push({
      rule: "max-one-image-preload",
      detail: `${preloads.length} image preloads — the art bible allows exactly one (the LCP picture)`,
    });
  }

  for (const attrs of preloads) {
    const href = attrs.get("href");
    if (!href) {
      violations.push({ rule: "image-preload-not-rendered", detail: "image preload without href" });
      continue;
    }
    const key = urlKey(href);
    if (!rendered.includes(key)) {
      violations.push({
        rule: "image-preload-not-rendered",
        detail: `${key} is preloaded but no app source renders it — a second request for the same picture`,
      });
    }
  }

  for (const attrs of tags(input.shellHtml, "img").map(attributes)) {
    const id = attrs.get("id");
    if (!id) continue;
    if (isRewritten(id, input.appSources)) {
      violations.push({
        rule: "shell-image-rewritten",
        detail: `#${id} ships src="${attrs.get("src") ?? ""}" and the app reassigns it — one picture, two requests`,
      });
    }
  }

  return violations;
}

describe("LCP shell contract", () => {
  it("the shipped shell preloads no image URL the app does not render", () => {
    expect(auditLcpShell({ shellHtml: read("index.html"), appSources: appSources() })).toEqual([]);
  });

  it("catches the pre-refactor markup: a shell thumb the script repoints", () => {
    const violations = auditLcpShell({
      shellHtml: read("legacy/index.html"),
      appSources: [{ path: "legacy/assets/js/app.js", text: read("legacy/assets/js/app.js") }],
    });

    expect(violations.map((violation) => violation.rule)).toContain("shell-image-rewritten");
    expect(violations.find((violation) => violation.rule === "shell-image-rewritten")?.detail).toContain(
      "#pack-preview",
    );
  });

  it("catches a preload whose URL the app never renders", () => {
    const violations = auditLcpShell({
      shellHtml: '<link rel="preload" as="image" href="/photos/derived/tile/elsa-01.webp?v=1">',
      appSources: [{ path: "src/App.svelte", text: '<img src="/img/photo-unavailable.webp" alt="">' }],
    });

    expect(violations.map((violation) => violation.rule)).toContain("image-preload-not-rendered");
  });

  it("accepts a preload that names the URL the app renders", () => {
    const violations = auditLcpShell({
      shellHtml: '<link rel="preload" as="image" href="/img/photo-unavailable.webp">',
      appSources: [{ path: "src/App.svelte", text: 'src: "/img/photo-unavailable.webp"' }],
    });

    expect(violations).toEqual([]);
  });

  it("catches a second image preload", () => {
    const html = [
      '<link rel="preload" as="image" href="/a.webp">',
      '<link rel="preload" as="image" href="/b.webp">',
    ].join("\n");
    const sources = [{ path: "src/a.ts", text: '"/a.webp" "/b.webp"' }];

    expect(auditLcpShell({ shellHtml: html, appSources: sources }).map((v) => v.rule)).toContain(
      "max-one-image-preload",
    );
  });

  it("catches the aliased assignment shape the legacy app used", () => {
    const violations = auditLcpShell({
      shellHtml: '<img id="seal-preview" src="/tile.webp" width="360" height="480">',
      appSources: [
        {
          path: "src/seal.ts",
          text: [
            'const els: Record<string, HTMLImageElement> = {};',
            'els.sealPreview = document.getElementById("seal-preview");',
            "els.sealPreview.src = cover.thumb;",
          ].join("\n"),
        },
      ],
    });

    expect(violations.map((violation) => violation.rule)).toEqual(["shell-image-rewritten"]);
  });
});
