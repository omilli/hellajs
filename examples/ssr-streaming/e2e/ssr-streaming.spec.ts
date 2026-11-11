import { expect, test } from "playwright/test";

const BASE_URL = "http://localhost:4315";

test.describe("ssr-streaming e2e", () => {
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

  test.describe("stream order over raw response chunks", () => {
    async function readUntil(
      reader: ReadableStreamDefaultReader<Uint8Array>,
      marker: string,
    ): Promise<string> {
      const decoder = new TextDecoder();
      let text = "";
      while (!text.includes(marker)) {
        const next = await reader.read();
        if (next.done) throw new Error(`stream closed before "${marker}" arrived`);
        text += decoder.decode(next.value, { stream: true });
      }
      return text;
    }

    test("flushes the shell before any Suspense region resolves", async () => {
      const response = await fetch(`${BASE_URL}/`);
      const stream = response.body;
      if (!stream) throw new Error("expected the response to carry a body stream");
      const reader = stream.getReader();
      const shell = await readUntil(reader, "Ada Lovelace");
      expect(shell).toContain("Dashboard");
      expect(shell).toContain("Ada Lovelace");
      expect(shell).not.toContain("Revenue");
      expect(shell).not.toContain("Accounting");
      await reader.cancel();
    });

    test("flushes the resolved Stats values in a later chunk after the shell", async () => {
      const response = await fetch(`${BASE_URL}/`);
      const stream = response.body;
      if (!stream) throw new Error("expected the response to carry a body stream");
      const reader = stream.getReader();
      const shell = await readUntil(reader, "Ada Lovelace");
      expect(shell).not.toContain("$48.2k");
      const stats = await readUntil(reader, "$48.2k");
      expect(stats).toContain("$48.2k");
      await reader.cancel();
    });
  });

  test("shows the three Top items skeleton bars right after navigation", async ({ page }) => {
    await page.goto("/", { waitUntil: "commit" });
    const top = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Top items" }) });
    await expect(top.locator("span")).toHaveCount(3);
    await page.waitForLoadState("load");
  });

  test("resolves the Stats card with its three values", async ({ page }) => {
    await page.goto("/");
    const stats = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Stats" }) });
    await expect(stats.getByText("$48.2k")).toBeVisible();
    await expect(stats.getByText("12,904")).toBeVisible();
    await expect(stats.getByText("2.1%")).toBeVisible();
  });

  test("resolves the Recent activity card with its three items", async ({ page }) => {
    await page.goto("/");
    const activity = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Recent activity" }) });
    await expect(activity.getByRole("listitem")).toHaveText([
      "Ada upgraded to Pro",
      "Build #281 deployed",
      "Grace closed 3 tickets",
    ]);
  });

  test("resolves the Top items card as an ordered list in order", async ({ page }) => {
    await page.goto("/");
    const top = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Top items" }) });
    await expect(top.locator("ol").getByRole("listitem")).toHaveText([
      "Accounting",
      "Design system",
      "Mobile app",
    ]);
  });

  test("keeps the resolved values after hydration settles and drops every skeleton", async ({
    page,
  }) => {
    await page.goto("/");
    const stats = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Stats" }) });
    const activity = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Recent activity" }) });
    const top = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Top items" }) });
    await expect(top.locator("ol").getByRole("listitem")).toHaveText([
      "Accounting",
      "Design system",
      "Mobile app",
    ]);
    await page.waitForTimeout(300);
    await expect(stats.getByText("$48.2k")).toBeVisible();
    await expect(stats.getByText("12,904")).toBeVisible();
    await expect(stats.getByText("2.1%")).toBeVisible();
    await expect(activity.getByRole("listitem")).toHaveText([
      "Ada upgraded to Pro",
      "Build #281 deployed",
      "Grace closed 3 tickets",
    ]);
    await expect(top.locator("ol").getByRole("listitem")).toHaveText([
      "Accounting",
      "Design system",
      "Mobile app",
    ]);
    await expect(page.locator("main span")).toHaveCount(0);
  });

  test("ships the hella-css style tag in the document head", async ({ page }) => {
    await page.goto("/");
    const css = page.locator("head style#hella-css");
    await expect(css).toHaveCount(1);
    expect((await css.textContent()) ?? "").toContain("body");
  });
});
