import { expect, test } from "@playwright/test";

test.describe("binder tile text alternatives", () => {
  test("every tile image has a non-empty alt", async ({ page }) => {
    await page.goto("/");
    const alts = await page.locator("#katalog .tile__photo").evaluateAll((images) =>
      images.map((image) => image.getAttribute("alt") ?? ""),
    );
    expect(alts.length).toBeGreaterThan(0);
    for (const alt of alts) expect(alt.trim().length).toBeGreaterThan(0);
  });

  test("every tile's accessible name names the card and its state", async ({ page }) => {
    await page.goto("/");
    const names = await page.locator("#katalog .tile").evaluateAll((tiles) =>
      tiles.map((tile) => tile.getAttribute("aria-label") ?? ""),
    );
    expect(names.length).toBeGreaterThan(0);
    for (const name of names) {
      expect(name).toMatch(/^Karte \d+ öffnen: .+, (gesammelt|noch nicht gesammelt)$/);
    }
  });
});
