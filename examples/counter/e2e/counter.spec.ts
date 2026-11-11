import { expect, test } from "playwright/test";

test.describe("counter e2e", () => {
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

  test("renders the seeded state with decrement and reset disabled", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading")).toHaveText("Counter: 0");
    await expect(page.getByRole("button", { name: "-" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Reset" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "+" })).toBeEnabled();
  });

  test("incrementing twice updates the heading live and enables decrement and reset", async ({
    page,
  }) => {
    await page.goto("/");
    const increment = page.getByRole("button", { name: "+" });
    await increment.click();
    await increment.click();
    await expect(page.getByRole("heading")).toHaveText("Counter: 2");
    await expect(page.getByRole("button", { name: "-" })).toBeEnabled();
    await expect(page.getByRole("button", { name: "Reset" })).toBeEnabled();
  });

  test("decrement walks the count back down", async ({ page }) => {
    await page.goto("/");
    const increment = page.getByRole("button", { name: "+" });
    await increment.click();
    await increment.click();
    await page.getByRole("button", { name: "-" }).click();
    await expect(page.getByRole("heading")).toHaveText("Counter: 1");
  });

  test("reset returns to zero and re-disables decrement and reset", async ({ page }) => {
    await page.goto("/");
    const increment = page.getByRole("button", { name: "+" });
    await increment.click();
    await increment.click();
    await page.getByRole("button", { name: "Reset" }).click();
    await expect(page.getByRole("heading")).toHaveText("Counter: 0");
    await expect(page.getByRole("button", { name: "-" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Reset" })).toBeDisabled();
  });
});
