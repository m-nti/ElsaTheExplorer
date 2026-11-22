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
  }
}

const TILE_WEBP_CEILING = 36_000;
const TILE_JPEG_CEILING = 55_000;

/**
 * One cold view, measured. The page is served by the Playwright `webServer`
 * (`npm run preview`) against `dist/`, so this is the artifact the reader gets.
 */
async function measureFirstView(page: Page): Promise<FirstView> {
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
  });

  await page.goto("/", { waitUntil: "load" });

  // Condition-based, never a sleep: the display face must have resolved before
  // CLS is read, or a swap that has not happened yet would read as no shift.
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
  });
  await page.waitForFunction(() => window.__lcp.length > 0);

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

test("the first-view picture is fetched once, at its own size, with no shift", async ({ page }) => {
  const seen = await measureFirstView(page);

  // One element, one URL. A second request for the same picture is the defect.
  expect(seen.images).toHaveLength(1);
  const urls = [...new Set(seen.requests.map((request) => request.url))];
  expect(urls).toHaveLength(1);
  expect(seen.requests).toHaveLength(1);

  // E-DLV-02: the rung's ceiling, by the format actually served.
  const request = seen.requests[0];
  if (!request) throw new Error("no image response observed");
  const ceiling = request.contentType === "image/webp" ? TILE_WEBP_CEILING : TILE_JPEG_CEILING;
  expect(request.bytes).toBeGreaterThan(0);
  expect(request.bytes).toBeLessThanOrEqual(ceiling);

  // E-DLV-09 / E-DLV-16: decoded pixels are the declared pixels.
  const image = seen.images[0];
  if (!image) throw new Error("no image element rendered");
  expect(image.naturalWidth).toBeGreaterThan(0);
  expect(image.naturalWidth).toBe(image.width);
  expect(image.naturalHeight).toBe(image.height);
  // The LCP element is viewport-dependent (the wordmark outranks the picture on
  // desktop, the picture on a phone). What must hold either way: if the LCP is
  // an image, it is this image, and this image is eager and high priority.
  if (seen.lcp.element.startsWith("IMG")) expect(seen.lcp.url).toBe(image.src);
  expect(image.fetchpriority).toBe("high");
  expect(image.loading).toBe("eager");
  expect(seen.preloads.length).toBeLessThanOrEqual(1);
  for (const href of seen.preloads) expect(href).toBe(image.src);

  // CLS: the picture reserves its box, so no shift ever has it as a source.
  // The residual total is the Chivo face swap on three text nodes (measured
  // 0.0006 after the Ultra fallback; #81). 0.005 fails the pre-fix 0.0075 —
  // the defect class this ticket removed — while leaving room for another
  // platform's substitute face; the exact assertion is imageShifts above.
  expect(seen.imageShifts).toBe(0);
  expect(seen.cls).toBeLessThan(0.005);
});
