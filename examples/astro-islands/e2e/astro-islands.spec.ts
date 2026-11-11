import { expect, test } from "playwright/test";

const BASE_URL = "http://localhost:4318";

test.describe("astro-islands e2e", () => {
  const pageErrors: string[] = [];

  test.beforeEach(async ({ page }) => {
    pageErrors.length = 0;
    await page.route("**/favicon.ico", (route) => route.fulfill({ status: 200, body: "" }));
    page.on("pageerror", (error) => pageErrors.push(`pageerror: ${error}`));
    page.on("console", (message) => {
      if (message.type() === "error") pageErrors.push(`console.error: ${message.text()}`);
    });
  });

  test.afterEach(() => {
    expect(pageErrors, "no page or console errors").toEqual([]);
  });

  test.describe("static shell without JavaScript", () => {
    test.use({ javaScriptEnabled: false });

    test("serves the static shell with the counter island's initial markup", async ({ page }) => {
      await page.goto("/");
      await expect(page.getByRole("heading", { name: "Astro Islands" })).toBeVisible();
      await expect(page.getByText("Name", { exact: true })).toBeVisible();
      await expect(page.locator("#name-input")).toBeVisible();
      await expect(page.locator("#greeting")).toHaveText("");
      await expect(page.getByRole("button", { name: "0" })).toHaveText("0");
    });
  });

  test("increments the counter island to 2 after two clicks", async ({ page }) => {
    await page.goto("/");
    const button = page.getByRole("button");
    await button.click();
    await button.click();
    await expect(button).toHaveText("2");
  });

  test("tracks pointer coordinates inside the mouse tracker box after hydration", async ({
    page,
  }) => {
    await page.goto("/");
    const tracker = page.locator("div").filter({ hasText: "Move your cursor here" });
    await expect(tracker).toContainText("Pointer: 0, 0");
    const box = await tracker.boundingBox();
    expect(box).not.toBeNull();
    const targetX = Math.round(box!.x + box!.width / 2);
    const targetY = Math.round(box!.y + box!.height / 2);
    await page.mouse.move(targetX, targetY);
    await expect(tracker).toContainText(`Pointer: ${targetX}, ${targetY}`);
  });

  test("updates the greeting from the name input through the name sync binding", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator("#greeting")).toHaveText("Hello, User!");
    await page.locator("#name-input").fill("Ada");
    await expect(page.locator("#greeting")).toHaveText("Hello, Ada!");
    expect(page.url()).toBe(`${BASE_URL}/`);
  });

  test("serves the islands page with the astro title and english language", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle("Astro Islands");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });
});
