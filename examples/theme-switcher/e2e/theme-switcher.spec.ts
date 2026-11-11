import { expect, test } from "playwright/test";

test.describe("theme-switcher e2e", () => {
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

  test("renders the light theme with the dark-toggle label", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button")).toHaveText("🌙 Dark");
    await expect(page.locator("body")).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await expect(page.locator("body")).toHaveCSS("color", "rgb(26, 26, 46)");
  });

  test("toggling once flips the body colors to dark and inverts the button", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button").click();
    await expect(page.getByRole("button")).toHaveText("☀️ Light");
    await expect(page.locator("body")).toHaveCSS("background-color", "rgb(26, 26, 46)");
    await expect(page.locator("body")).toHaveCSS("color", "rgb(255, 255, 255)");
    await expect(page.getByRole("button")).toHaveCSS("background-color", "rgb(255, 255, 255)");
  });

  test("toggling twice restores the light theme", async ({ page }) => {
    await page.goto("/");
    const toggle = page.getByRole("button");
    await toggle.click();
    await toggle.click();
    await expect(toggle).toHaveText("🌙 Dark");
    await expect(page.locator("body")).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await expect(page.locator("body")).toHaveCSS("color", "rgb(26, 26, 46)");
  });
});
