import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const activeFocusId = (page: Page) =>
  page.evaluate(() => document.activeElement?.getAttribute("data-focus-id"));

test("close button returns focus to the invoking tile", async ({ page }) => {
  await page.goto("/");
  await page.locator('[data-focus-id="elsa-02"]').click();
  await expect(page.locator("dialog[open]")).toBeVisible();
  await page.getByRole("button", { name: "Diese Karte schließen" }).click();
  await expect(page.locator("dialog[open]")).toHaveCount(0);
  await expect.poll(() => activeFocusId(page)).toBe("elsa-02");
});

test("Escape returns focus to the invoking tile", async ({ page }) => {
  await page.goto("/");
  await page.locator('[data-focus-id="elsa-03"]').focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("dialog[open]")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("dialog[open]")).toHaveCount(0);
  await expect.poll(() => activeFocusId(page)).toBe("elsa-03");
});

test("deep-link close falls back to the CTA, never body", async ({ page }) => {
  await page.goto("/?photo=elsa-02");
  await expect(page.locator("dialog[open]")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect.poll(() => page.evaluate(() => document.activeElement?.id)).toBe("open-pack");
  expect(await page.evaluate(() => document.activeElement === document.body)).toBe(false);
});

test("browser Back closes the dialog and returns focus to the invoking tile", async ({ page }) => {
  await page.goto("/");
  await page.locator('[data-focus-id="elsa-04"]').click();
  await expect(page.locator("dialog[open]")).toBeVisible();
  await page.goBack();
  await expect(page.locator("dialog[open]")).toHaveCount(0);
  await expect.poll(() => activeFocusId(page)).toBe("elsa-04");
});

test("backdrop click closes and returns focus to the invoking tile", async ({ page }) => {
  await page.goto("/");
  await page.locator('[data-focus-id="elsa-01"]').click();
  await expect(page.locator("dialog[open]")).toBeVisible();
  // The dialog is centred and narrower than the viewport; a corner click is the backdrop.
  await page.mouse.click(2, 2);
  await expect(page.locator("dialog[open]")).toHaveCount(0);
  await expect.poll(() => activeFocusId(page)).toBe("elsa-01");
});

test("an unknown deep link opens no dialog and leaves the URL alone", async ({ page }) => {
  await page.goto("/?photo=missing");
  await expect(page.locator("dialog[open]")).toHaveCount(0);
  expect(new URL(page.url()).searchParams.get("photo")).toBe("missing");
});
