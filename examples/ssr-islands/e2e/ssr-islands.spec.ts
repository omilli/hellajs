import { expect, test } from "playwright/test";

const BASE_URL = "http://localhost:4316";

test.describe("ssr-islands e2e", () => {
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

  test.describe("server shell without JavaScript", () => {
    test.use({ javaScriptEnabled: false });

    test("renders the h1 shell with an empty #app mount slot", async ({ page }) => {
      await page.goto("/");
      await expect(page.getByRole("heading")).toHaveText("SSR Islands");
      await expect(page.locator("#app")).toHaveText("");
    });

    test("delivers the collected button styles in the hella-css style tag", async ({ page }) => {
      await page.goto("/");
      const css = await page.locator("#hella-css").textContent();
      expect(css).toContain("button");
      expect(css).toContain("1px solid #2563eb");
    });

    test("serves the client bundle with a JavaScript content type and a module script tag", async ({
      page,
    }) => {
      const response = await page.request.get(`${BASE_URL}/client.js`);
      expect(response.status()).toBe(200);
      expect(response.headers()["content-type"]).toContain("text/javascript");
      await page.goto("/");
      await expect(page.locator('head script[src="/client.js"]')).toHaveAttribute("type", "module");
    });
  });

  test("mounts the counter island client-side into #app", async ({ page }) => {
    await page.goto("/");
    const island = page.locator("#app");
    await expect(island.getByText("Count: 0")).toBeVisible();
    await expect(island.getByRole("button", { name: "Increment" })).toBeVisible();
  });

  test("three increments update the island count", async ({ page }) => {
    await page.goto("/");
    const increment = page.locator("#app").getByRole("button", { name: "Increment" });
    await increment.click();
    await increment.click();
    await increment.click();
    await expect(page.locator("#app").getByText("Count: 3")).toBeVisible();
  });
});
