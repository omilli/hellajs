import { expect, test } from "playwright/test";

test.describe("todo e2e", () => {
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

  test("renders the two seed items unchecked with stats, no clear button, and the title", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByRole("listitem")).toHaveCount(2);
    await expect(
      page.getByRole("listitem").filter({ hasText: "Learn HellaJS" }).getByRole("checkbox"),
    ).not.toBeChecked();
    await expect(
      page.getByRole("listitem").filter({ hasText: "Build a todo app" }).getByRole("checkbox"),
    ).not.toBeChecked();
    await expect(page.getByText("2 active, 0 done")).toBeVisible();
    await expect(page.getByRole("button", { name: "Clear Done" })).toHaveCount(0);
    await expect(page).toHaveTitle("Todo App (2 active)");
  });

  test("adding a todo appends it, clears the input, and updates stats and title", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByPlaceholder("What needs to be done?").fill("Write e2e specs");
    await page.getByRole("button", { name: "Add" }).click();
    await expect(page.getByRole("listitem").filter({ hasText: "Write e2e specs" })).toHaveCount(1);
    await expect(page.getByPlaceholder("What needs to be done?")).toHaveValue("");
    await expect(page.getByText("3 active, 0 done")).toBeVisible();
    await expect(page).toHaveTitle("Todo App (3 active)");
  });

  test("whitespace-only add is a no-op that keeps the input text", async ({ page }) => {
    await page.goto("/");
    await page.getByPlaceholder("What needs to be done?").fill("   ");
    await page.getByRole("button", { name: "Add" }).click();
    await expect(page.getByRole("listitem")).toHaveCount(2);
    await expect(page.getByPlaceholder("What needs to be done?")).toHaveValue("   ");
  });

  test("toggling a todo updates stats, reveals Clear Done, and retitles", async ({ page }) => {
    await page.goto("/");
    await page
      .getByRole("listitem")
      .filter({ hasText: "Learn HellaJS" })
      .getByRole("checkbox")
      .click();
    await expect(page.getByText("1 active, 1 done")).toBeVisible();
    await expect(page.getByRole("button", { name: "Clear Done" })).toBeVisible();
    await expect(page).toHaveTitle("Todo App (1 active)");
  });

  test("filter buttons carry live counts after a toggle", async ({ page }) => {
    await page.goto("/");
    await page
      .getByRole("listitem")
      .filter({ hasText: "Learn HellaJS" })
      .getByRole("checkbox")
      .click();
    await expect(page.getByRole("button", { name: "All (2)" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Active (1)" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Done (1)" })).toBeVisible();
  });

  test("active filter hides completed items and done filter shows only completed", async ({
    page,
  }) => {
    await page.goto("/");
    await page
      .getByRole("listitem")
      .filter({ hasText: "Learn HellaJS" })
      .getByRole("checkbox")
      .click();
    await page.getByRole("button", { name: "Active (1)" }).click();
    await expect(page.getByRole("listitem")).toHaveCount(1);
    await expect(page.getByRole("listitem").filter({ hasText: "Build a todo app" })).toHaveCount(1);
    await expect(page.getByRole("listitem").filter({ hasText: "Learn HellaJS" })).toHaveCount(0);
    await page.getByRole("button", { name: "Done (1)" }).click();
    await expect(page.getByRole("listitem")).toHaveCount(1);
    await expect(page.getByRole("listitem").filter({ hasText: "Learn HellaJS" })).toHaveCount(1);
    await expect(page.getByRole("listitem").filter({ hasText: "Build a todo app" })).toHaveCount(0);
  });

  test("done filter with nothing completed shows the empty state", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Done (0)" }).click();
    await expect(page.getByText("No completed todos yet.")).toBeVisible();
  });

  test("active filter with everything completed shows the empty state", async ({ page }) => {
    await page.goto("/");
    await page
      .getByRole("listitem")
      .filter({ hasText: "Learn HellaJS" })
      .getByRole("checkbox")
      .click();
    await page
      .getByRole("listitem")
      .filter({ hasText: "Build a todo app" })
      .getByRole("checkbox")
      .click();
    await page.getByRole("button", { name: "Active (0)" }).click();
    await expect(page.getByText("No active todos. Great job!")).toBeVisible();
  });

  test("deleting both seeds under the all filter shows the empty state and zeroed stats", async ({
    page,
  }) => {
    await page.goto("/");
    await page
      .getByRole("listitem")
      .filter({ hasText: "Learn HellaJS" })
      .getByRole("button", { name: "Delete" })
      .click();
    await page
      .getByRole("listitem")
      .filter({ hasText: "Build a todo app" })
      .getByRole("button", { name: "Delete" })
      .click();
    await expect(page.getByText("No todos yet! Add one above.")).toBeVisible();
    await expect(page.getByText("0 active, 0 done")).toBeVisible();
  });

  test("delete removes exactly the targeted item and updates stats", async ({ page }) => {
    await page.goto("/");
    await page
      .getByRole("listitem")
      .filter({ hasText: "Learn HellaJS" })
      .getByRole("button", { name: "Delete" })
      .click();
    await expect(page.getByRole("listitem").filter({ hasText: "Learn HellaJS" })).toHaveCount(0);
    await expect(page.getByRole("listitem").filter({ hasText: "Build a todo app" })).toHaveCount(1);
    await expect(page.getByText("1 active, 0 done")).toBeVisible();
  });

  test("clear done removes completed items only", async ({ page }) => {
    await page.goto("/");
    await page
      .getByRole("listitem")
      .filter({ hasText: "Learn HellaJS" })
      .getByRole("checkbox")
      .click();
    await page.getByRole("button", { name: "Clear Done" }).click();
    await expect(page.getByRole("listitem")).toHaveCount(1);
    await expect(page.getByRole("listitem").filter({ hasText: "Build a todo app" })).toHaveCount(1);
    await expect(page.getByRole("listitem").filter({ hasText: "Learn HellaJS" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Clear Done" })).toHaveCount(0);
  });

  test("a custom todo survives a reload through localStorage", async ({ page }) => {
    await page.goto("/");
    await page.getByPlaceholder("What needs to be done?").fill("Persist me");
    await page.getByRole("button", { name: "Add" }).click();
    await page.reload();
    await expect(page.getByRole("listitem").filter({ hasText: "Persist me" })).toHaveCount(1);
  });
});
