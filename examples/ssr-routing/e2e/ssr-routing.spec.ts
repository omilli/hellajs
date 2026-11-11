import { expect, test } from "playwright/test";

const BASE_URL = "http://localhost:4317";

test.describe("ssr-routing e2e", () => {
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

  test.describe("server render without JavaScript", () => {
    test.use({ javaScriptEnabled: false });

    test("renders the home view with the Home nav link active", async ({ page }) => {
      await page.goto("/");
      await expect(page.getByRole("heading")).toHaveText("Home");
      const homeLink = page.locator("nav").getByRole("link", { name: "Home" });
      const userLink = page.locator("nav").getByRole("link", { name: "User" });
      expect(await homeLink.getAttribute("class")).toContain("active");
      expect((await userLink.getAttribute("class")) ?? "").not.toContain("active");
    });

    test("renders the user view for /users/1 with the User nav link active", async ({ page }) => {
      await page.goto("/users/1");
      await expect(page.getByRole("heading")).toHaveText("User 1");
      const userLink = page.locator("nav").getByRole("link", { name: "User" });
      expect(await userLink.getAttribute("class")).toContain("active");
      const homeLink = page.locator("nav").getByRole("link", { name: "Home" });
      expect((await homeLink.getAttribute("class")) ?? "").not.toContain("active");
    });

    test("renders the not-found view for an unknown route", async ({ page }) => {
      await page.goto("/nope");
      await expect(page.getByRole("heading")).toHaveText("Not Found");
    });

    test("delivers the nav styles in the hella-css style tag", async ({ page }) => {
      await page.goto("/");
      const css = await page.locator("#hella-css").textContent();
      expect(css).toContain("nav");
      expect(css).toContain("active");
    });
  });

  test("navigates to the user view client-side without a document reload", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      (window as unknown as Record<string, boolean>).__e2eMarker = true;
    });
    await page.locator("nav").getByRole("link", { name: "User" }).click();
    await expect(page).toHaveURL(`${BASE_URL}/users/1`);
    await expect(page.getByRole("heading")).toHaveText("User 1");
    const homeLink = page.locator("nav").getByRole("link", { name: "Home" });
    const userLink = page.locator("nav").getByRole("link", { name: "User" });
    await expect(userLink).toHaveClass(/active/);
    await expect(homeLink).not.toHaveClass(/active/);
    expect(
      await page.evaluate(() => (window as unknown as Record<string, boolean>).__e2eMarker),
    ).toBe(true);
  });

  test("navigating back to Home moves the active class with it", async ({ page }) => {
    await page.goto("/");
    await page.locator("nav").getByRole("link", { name: "User" }).click();
    await expect(page.getByRole("heading")).toHaveText("User 1");
    await page.locator("nav").getByRole("link", { name: "Home" }).click();
    await expect(page).toHaveURL(`${BASE_URL}/`);
    await expect(page.getByRole("heading")).toHaveText("Home");
    const homeLink = page.locator("nav").getByRole("link", { name: "Home" });
    const userLink = page.locator("nav").getByRole("link", { name: "User" });
    await expect(homeLink).toHaveClass(/active/);
    await expect(userLink).not.toHaveClass(/active/);
  });

  test("browser back restores the user view after client-side navigation", async ({ page }) => {
    await page.goto("/");
    await page.locator("nav").getByRole("link", { name: "User" }).click();
    await expect(page.getByRole("heading")).toHaveText("User 1");
    await page.locator("nav").getByRole("link", { name: "Home" }).click();
    await expect(page.getByRole("heading")).toHaveText("Home");
    await page.goBack();
    await expect(page).toHaveURL(`${BASE_URL}/users/1`);
    await expect(page.getByRole("heading")).toHaveText("User 1");
    await expect(page.locator("nav").getByRole("link", { name: "User" })).toHaveClass(/active/);
  });
});
