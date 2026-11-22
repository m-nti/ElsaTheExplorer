/**
 * The runtime half of the #26 contract, and the network trace the ticket asks for.
 *
 * `tests/unit/lcp-contract.test.ts` pins what the shell may declare. This spec
 * pins what the browser actually does on a cold first view:
 *
 * - **E-DLV-10** — one request per rendered element. The pre-refactor app spent
 *   174,168 B on one picture (111,920 B static thumb + 62,248 B PHP thumb);
 *   the trace below records every image response so the number is measured,
 *   not assumed.
 * - **E-DLV-09** — the decoded pixels equal the declared `width`/`height`, which
 *   is what makes CLS 0 real rather than a coincidence of absolute positioning.
 * - **E-DLV-02** — the response sits inside its rung's ceiling (tile: 36 KB WebP
 *   / 55 KB JPEG).
 * - **CLS 0** — no layout shift at all, and the LCP element is the card photo.
 *   Both `font-display: swap` faces are metric-matched (`Ultra Fallback` #26,
 *   `Chivo Fallback` #81), so neither swap moves text.
 *
 * Run against a build: `npm run build && npx playwright test tests/e2e/lcp.spec.ts`.
 */
import { expect, test, type Page } from "@playwright/test";

interface ImageRequest {
  readonly url: string;
  readonly bytes: number;
  readonly contentType: string;
}

interface ImageFact {
  readonly src: string;
  readonly width: number;
  readonly height: number;
  readonly naturalWidth: number;
  readonly naturalHeight: number;
  readonly fetchpriority: string | null;
  readonly loading: string | null;
}

interface LcpFact {
  readonly url: string;
  readonly element: string;
}

interface FirstView {
  readonly requests: readonly ImageRequest[];
  readonly images: readonly ImageFact[];
  readonly cls: number;
  readonly imageShifts: number;
  readonly lcp: LcpFact;
  readonly preloads: readonly string[];
}

declare global {
  interface Window {
    __lcp: Array<{ url: string; tag: string }>;
    __shifts: Array<{ value: number; sources: string[] }>;
    __painted?: boolean;
  }
}

const TILE_WEBP_CEILING = 36_000;
const TILE_JPEG_CEILING = 55_000;

interface MeasureOptions {
  /**
   * Hold the Chivo request until the first frame has painted, then let it through.
   *
   * A swap only shifts text if the face arrives after first paint; on loopback the
   * font can win the race, and the same page then measures 0 with the defect
   * present. That is a false green, not a fast site: this option makes the swap
   * happen every run, so the assertion measures the case the fallback exists for.
   */
  readonly forceLateSwap?: boolean;
  /**
   * Scroll the page so the binder tiles (`loading="lazy"`) decode before the
   * pixel assertions run. WebKit does not preload lazy images near the viewport
   * the way Chromium does; without this the decoded size reads 0 on Safari.
   */
  readonly loadLazyImages?: boolean;
}

/**
 * One cold view, measured. The page is served by the Playwright `webServer`
 * (`npm run preview`) against `dist/`, so this is the artifact the reader gets.
 */
async function measureFirstView(page: Page, options: MeasureOptions = {}): Promise<FirstView> {
  const requests: ImageRequest[] = [];

  page.on("response", async (response) => {
    if (response.request().resourceType() !== "image") return;
    const body = await response.body().catch(() => null);
    requests.push({
      url: response.url(),
      bytes: body?.length ?? 0,
      contentType: response.headers()["content-type"] ?? "",
    });
  });

  let releaseFont = (): void => {};
  if (options.forceLateSwap) {
    const gate = new Promise<void>((resolve) => {
      releaseFont = resolve;
    });
    await page.route("**/fonts/chivo-latin.woff2", async (route) => {
      await gate;
      await route.continue();
    });
  }

  await page.addInitScript(() => {
    window.__lcp = [];
    window.__shifts = [];
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const paint = entry as PerformanceEntry & { url?: string; element?: Element | null };
        window.__lcp.push({
          url: paint.url ?? "",
          tag: paint.element ? `${paint.element.tagName}.${String(paint.element.className).trim()}` : "",
        });
      }
    }).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const shift = entry as PerformanceEntry & {
          value: number;
          hadRecentInput: boolean;
          sources?: Array<{ node: Node | null }>;
        };
        if (shift.hadRecentInput) continue;
        window.__shifts.push({
          value: shift.value,
          sources: (shift.sources ?? []).map((source) =>
            source.node?.nodeType === Node.ELEMENT_NODE
              ? (source.node as Element).tagName
              : "#text",
          ),
        });
      }
    }).observe({ type: "layout-shift", buffered: true });
    requestAnimationFrame(() => requestAnimationFrame(() => {
      window.__painted = true;
    }));
  });

  if (options.forceLateSwap) {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.__painted === true);
    releaseFont();
    await page.waitForLoadState("load");
  } else {
    await page.goto("/", { waitUntil: "load" });
  }

  // Condition-based, never a sleep: the display face must have resolved before
  // CLS is read, or a swap that has not happened yet would read as no shift.
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
  });
  await page.waitForFunction(() => window.__lcp.length > 0, null, { polling: 100 });

  if (options.loadLazyImages) {
    await page.evaluate(async () => {
      const step = window.innerHeight;
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise<void>((resolve) => {
          setTimeout(resolve, 0);
        });
      }
    });
    await page.waitForFunction(
      () => [...document.images].every((image) => image.complete && image.naturalWidth > 0),
      null,
      { polling: 100 },
    );
    await page.evaluate(() => window.scrollTo(0, 0));
  }

  const state = await page.evaluate(() => ({
    cls: window.__shifts.reduce((sum, shift) => sum + shift.value, 0),
    imageShifts: window.__shifts.filter((shift) => shift.sources.includes("IMG")).length,
    lcp: window.__lcp.at(-1) ?? { url: "", tag: "" },
    preloads: [...document.querySelectorAll('link[rel="preload"][as="image"]')].map(
      (link) => (link as HTMLLinkElement).href,
    ),
    images: [...document.images].map((image) => ({
      src: image.currentSrc || image.src,
      width: Number(image.getAttribute("width")),
      height: Number(image.getAttribute("height")),
      naturalWidth: image.naturalWidth,
      naturalHeight: image.naturalHeight,
      fetchpriority: image.getAttribute("fetchpriority"),
      loading: image.getAttribute("loading"),
    })),
  }));

  return {
    requests,
    images: state.images,
    cls: state.cls,
    imageShifts: state.imageShifts,
    lcp: { url: state.lcp.url, element: state.lcp.tag },
    preloads: state.preloads,
  };
}

test("the first-view pictures are fetched once each, at their own size, with no shift", async ({ page }) => {
  const seen = await measureFirstView(page, { loadLazyImages: true });

  // One element, one URL. A second response for the same URL is the defect. The
  // page renders the binder grid (four tiles today), so "the picture" is plural —
  // the invariant is per element and per URL, never "one image on the page".
  expect(seen.images.length).toBeGreaterThan(0);
  const urls = [...new Set(seen.requests.map((request) => request.url))];
  const responseCount = (url: string): number => seen.requests.filter((request) => request.url === url).length;
  for (const image of seen.images) {
    expect(urls).toContain(image.src);
    expect(responseCount(image.src)).toBe(1);
  }

  // E-DLV-02: the rung's ceiling, by the format actually served.
  for (const request of seen.requests) {
    const ceiling = request.contentType === "image/webp" ? TILE_WEBP_CEILING : TILE_JPEG_CEILING;
    expect(request.bytes).toBeGreaterThan(0);
    expect(request.bytes).toBeLessThanOrEqual(ceiling);
  }

  // E-DLV-09 / E-DLV-16: decoded pixels are the declared pixels.
  for (const image of seen.images) {
    expect(image.naturalWidth).toBeGreaterThan(0);
    expect(image.naturalWidth).toBe(image.width);
    expect(image.naturalHeight).toBe(image.height);
  }

  // The LCP element is viewport-dependent (the wordmark outranks the pictures on
  // desktop; the first tile can on a phone). What must hold either way: if the
  // LCP is an image, it is one of the rendered pictures.
  if (seen.lcp.element.startsWith("IMG")) {
    expect(seen.images.map((image) => image.src)).toContain(seen.lcp.url);
  }

  // Art-bible §8: binder tiles are lazy and below the fold, so none of them
  // claims the LCP priority. (The #26 single stage card that did was replaced by
  // the binder grid in B2; this assertion follows the shipped surface.)
  for (const image of seen.images) {
    expect(image.loading).toBe("lazy");
    expect(image.fetchpriority).toBeNull();
  }
  expect(seen.preloads.length).toBeLessThanOrEqual(1);
  for (const href of seen.preloads) expect(urls).toContain(href);
});

/**
 * The acceptance viewports, in the engine that can measure layout shifts. The
 * project viewports alone would miss the regression: at 390 x 844 DPR 2 the
 * pre-#81 Chivo swap moved the tagline and eyebrow 1 px (0.000565), while at DPR 1
 * the same shift rounded to zero.
 */
test.describe("a cold first view at 390 x 844", () => {
  test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });

  test("has no layout shift", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "WebKit has no Layout Instability API; the metric test carries the claim there");
    const seen = await measureFirstView(page, { forceLateSwap: true });

    // The picture reserves its box, and both face swaps are metric-matched
    // (`Ultra Fallback` #26, `Chivo Fallback` #81), so nothing moves at all.
    expect(seen.imageShifts).toBe(0);
    expect(seen.cls).toBe(0);
  });
});

test.describe("a cold first view at 1280 x 720", () => {
  test.use({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });

  test("has no layout shift", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "WebKit has no Layout Instability API; the metric test carries the claim there");
    const seen = await measureFirstView(page, { forceLateSwap: true });
    expect(seen.imageShifts).toBe(0);
    expect(seen.cls).toBe(0);
  });
});

/**
 * The engine-independent half: a swap cannot move text if the interim face's
 * line box, baseline and advance width already equal the real face's. Measured
 * inside the page on the built artifact, so it holds on WebKit too, where the
 * layout-shift entry type does not exist.
 */
test("the Chivo fallbacks match Chivo's line box, baseline and advance width", async ({ page }) => {
  await page.goto("/", { waitUntil: "load" });
  const match = await page.evaluate(async () => {
    await document.fonts.load('400 13px "Chivo"');
    await document.fonts.load('600 11px "Chivo"');
    await document.fonts.ready;

    const probe = (
      family: string,
      weight: number,
      size: number,
      text: string,
      letterSpacing = "normal",
      transform = "none",
    ) => {
      const host = document.createElement("div");
      host.style.cssText =
        `position:absolute;left:-10000px;top:0;font-family:${family};font-weight:${weight};` +
        `font-size:${size}px;letter-spacing:${letterSpacing};text-transform:${transform};` +
        `line-height:normal;white-space:nowrap`;
      host.textContent = text;
      document.body.appendChild(host);
      const box = host.getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(host);
      const width = range.getBoundingClientRect().width;
      const marker = document.createElement("span");
      marker.style.cssText = "display:inline-block;width:0;height:0;vertical-align:baseline";
      host.appendChild(marker);
      const baseline = marker.getBoundingClientRect().bottom - box.top;
      host.remove();
      return { lineBox: box.height, baseline, width };
    };

    const copy = "Die Sammlung ist das Produkt. Elsa ist der Sammlungsmechanismus.";
    const eyebrow = "Sammelwerk · Erste Auflage";
    // The face name alone is not enough: before #81 these names fall through to
    // the generic sans, whose line box is visibly taller and whose caps are wider.
    return {
      bodyChivo: probe('"Chivo"', 400, 13, copy),
      bodyFallback: probe('"Chivo Fallback", sans-serif', 400, 13, copy),
      labelChivo: probe('"Chivo"', 600, 11, eyebrow, "0.14em", "uppercase"),
      labelFallback: probe('"Chivo Label Fallback", sans-serif', 600, 11, eyebrow, "0.14em", "uppercase"),
    };
  });

  // The two engines do not resolve `local("Arial")` identically at weight 600:
  // WebKit takes the Bold instance (advance 2 % wider), Chromium keeps the
  // regular one. On body copy that would matter, and there the tolerance is
  // 0.2 %; on the centred label it is 4.4 px of advance = a 2.2 px move, below
  // the 3 px threshold Chromium uses to report a layout shift at all.
  const pairs = [
    { chivo: match.bodyChivo, fallback: match.bodyFallback, widthTolerance: 0.002 },
    { chivo: match.labelChivo, fallback: match.labelFallback, widthTolerance: 0.025 },
  ] as const;

  for (const { chivo, fallback, widthTolerance } of pairs) {
    // 0.5 px: WebKit rounds the baseline inside the line box differently from
    // Chromium (measured 0.28 px); the unmatched face is 14 px off, so the
    // tolerance still separates "metric-matched" from "some other sans".
    expect(Math.abs(fallback.lineBox - chivo.lineBox)).toBeLessThan(0.5);
    expect(Math.abs(fallback.baseline - chivo.baseline)).toBeLessThan(0.5);
    expect(Math.abs(fallback.width - chivo.width)).toBeLessThan(chivo.width * widthTolerance);
  }
});
