/**
 * Reset confirmation — E-RST-01…10, E-FOC-10/11, reduced motion (#27).
 *
 * The ticket's evidence is behavioural: one activation must not destroy
 * anything, Cancel must be the default and must write nothing, Escape and the
 * backdrop must behave like Cancel, Confirm must clear the whole `lucky-elsa.*`
 * namespace and say so once, and focus must come back to the trigger.
 *
 * Seeds are written by the test, not the app, so the assertions are about the
 * wipe and not about the B1 shell's (absent) collection UI.
 */
import { expect, test, type Page } from "@playwright/test";

const RESET_BODY_DE =
  "Das löscht die Sammlung, die Räume samt Fortschritt, die Meilensteine und Elsas Ehrenmensch — Ton und Sprache kehren auf Standard zurück.";
const LIVE_RESET_DE = "Von vorn. Alle Karten können wieder kommen.";

const SEED = {
  "lucky-elsa.lang.v2": '{"v":2,"data":"en"}',
  "lucky-elsa.sound.v2": '{"v":2,"data":false}',
  "lucky-elsa.seen.v2": '{"v":2,"data":["elsa-01","elsa-02"]}',
  "lucky-elsa.visits.v1": "3",
  "lucky-elsa.stale.v0": "left over from an older build",
  "another.tool.key": "not ours",
};

const trigger = (page: Page) => page.getByRole("button", { name: "Von vorn", exact: true });
const dialog = (page: Page) => page.getByRole("alertdialog");
const cancel = (page: Page) => page.getByRole("button", { name: "Abbrechen", exact: true });
const confirm = (page: Page) => page.getByRole("button", { name: "Alles löschen", exact: true });

async function seed(page: Page): Promise<void> {
  // `domcontentloaded` is enough: the assertions click (auto-waiting) and read
  // storage; waiting for every cold WebKit asset on the first test is what made
  // this suite time out under load.
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.evaluate((entries) => {
    for (const [key, value] of Object.entries(entries)) localStorage.setItem(key, value);
  }, SEED);
}

function storage(page: Page): Promise<string> {
  return page.evaluate(() =>
    JSON.stringify(Object.entries(localStorage).sort(([a], [b]) => a.localeCompare(b))),
  );
}

function luckyKeys(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    Object.keys(localStorage)
      .filter((key) => key.startsWith("lucky-elsa."))
      .sort(),
  );
}

test.beforeEach(async ({ page }) => {
  await seed(page);
});

test("E-RST-01: the trigger opens a confirmation and destroys nothing", async ({ page }) => {
  const before = await storage(page);

  await trigger(page).click();

  await expect(dialog(page)).toBeVisible();
  expect(await storage(page)).toBe(before);
});

test("E-RST-02/E-RST-03: Cancel has the default focus and the body names the loss", async ({ page }) => {
  await trigger(page).click();

  await expect(cancel(page)).toBeFocused();
  await expect(dialog(page).getByText(RESET_BODY_DE, { exact: true })).toBeVisible();
  await expect(dialog(page)).toHaveAccessibleDescription(RESET_BODY_DE);
});

test("E-RST-10: native dialog, labelled title and described body", async ({ page }) => {
  await trigger(page).click();

  const sheet = page.locator("dialog[open]");
  await expect(sheet).toHaveCount(1);
  await expect(sheet).toHaveAttribute("role", "alertdialog");
  await expect(sheet).toHaveAccessibleName("Von vorn?");
  await expect(sheet).toHaveAttribute("aria-describedby", "reset-body");
});

test("E-RST-04/E-FOC-10: Escape closes with zero writes and returns focus", async ({ page }) => {
  const before = await storage(page);
  await trigger(page).click();

  await page.keyboard.press("Escape");

  await expect(dialog(page)).toBeHidden();
  expect(await storage(page)).toBe(before);
  await expect(trigger(page)).toBeFocused();
});

test("E-RST-04: Cancel closes with zero writes", async ({ page }) => {
  const before = await storage(page);
  await trigger(page).click();

  await cancel(page).click();

  await expect(dialog(page)).toBeHidden();
  expect(await storage(page)).toBe(before);
});

test("E-RST-04/E-FOC-10: a backdrop click cancels", async ({ page }) => {
  const before = await storage(page);
  await trigger(page).click();

  await page.locator("dialog[open]").click({ position: { x: 4, y: 4 } });

  await expect(dialog(page)).toBeHidden();
  expect(await storage(page)).toBe(before);
  await expect(trigger(page)).toBeFocused();
});

test("E-KBD-07: the cycle stays inside the dialog and no page control is reachable", async ({ page }) => {
  await trigger(page).click();
  await expect(cancel(page)).toBeFocused();

  // Engines differ in whether the native modal cycle includes one browser-owned
  // stop on the document. What must hold everywhere: every stop is inside the
  // dialog or the document itself (never a page control), and both buttons are
  // reached. ADR-0010 §3 keeps the trap native.
  const stops: string[] = [];
  for (let press = 0; press < 4; press += 1) {
    await page.keyboard.press("Tab");
    stops.push(
      await page.evaluate(() => {
        const active = document.activeElement;
        if (active === null) return "none";
        if (active.closest("dialog[open]") !== null) return active.textContent?.trim() ?? "";
        return active === document.body ? "document" : `OUTSIDE:${active.outerHTML.slice(0, 40)}`;
      }),
    );
  }

  expect(stops).toContain("Abbrechen");
  expect(stops).toContain("Alles löschen");
  expect(stops.filter((stop) => stop.startsWith("OUTSIDE"))).toEqual([]);

  await page.keyboard.press("Escape");
  await expect(dialog(page)).toBeHidden();
  await expect(trigger(page)).toBeFocused();
});

test("E-RST-05/E-RST-06/E-FOC-11: confirm clears every lucky key, keeps strangers, announces once", async ({
  page,
}) => {
  await page.evaluate(() => {
    const region = document.getElementById("live-status");
    if (region === null) throw new Error("#live-status is missing");
    (window as unknown as { __writes: number }).__writes = 0;
    new MutationObserver(() => {
      (window as unknown as { __writes: number }).__writes += 1;
    }).observe(region, { childList: true, characterData: true, subtree: true });
  });
  await trigger(page).click();

  await confirm(page).click();

  await expect(dialog(page)).toBeHidden();
  expect(await luckyKeys(page)).toEqual([]);
  expect(await page.evaluate(() => localStorage.getItem("another.tool.key"))).toBe("not ours");
  await expect(page.locator("#live-status")).toHaveText(LIVE_RESET_DE);
  expect(await page.evaluate(() => (window as unknown as { __writes: number }).__writes)).toBe(1);
  await expect(trigger(page)).toBeFocused();
});

test("E-RST-07: a reload after the reset stays reset", async ({ page }) => {
  await trigger(page).click();
  await confirm(page).click();
  await expect(dialog(page)).toBeHidden();

  await page.reload();

  await expect(trigger(page)).toBeVisible();
  expect(await luckyKeys(page)).toEqual([]);
  expect(await page.evaluate(() => localStorage.getItem("another.tool.key"))).toBe("not ours");
});

test("E-RST-09: no keyboard shortcut triggers the reset", async ({ page }) => {
  const before = await storage(page);
  await page.locator("body").click();

  for (const key of ["r", "R", "Shift+R"]) {
    await page.keyboard.press(key);
    await expect(dialog(page)).toBeHidden();
  }
  expect(await storage(page)).toBe(before);
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("the dialog opens without an animation", async ({ page }) => {
    await trigger(page).click();
    await expect(dialog(page)).toBeVisible();

    const animationName = await page
      .locator("dialog[open]")
      .evaluate((element) => getComputedStyle(element).animationName);
    expect(animationName).toBe("none");
  });
});
