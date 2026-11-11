import { expect, test } from "playwright/test";

const BASE_URL = "http://localhost:4314";

const makePost = (id: number) => ({
  id,
  title: `Post ${id} title`,
  body: `Full body of post ${id}.`,
  tags: [`tag${id}a`, `tag${id}b`],
  reactions: { likes: id, dislikes: 0 },
  views: id * 10,
  userId: id,
});

/** 21 total posts so the list paginates into 3 pages of 10/10/1. */
const ALL_POSTS = Array.from({ length: 21 }, (_, index) => makePost(index + 1));

const listPage = (page: number) => ({
  posts: ALL_POSTS.slice((page - 1) * 10, page * 10),
  total: ALL_POSTS.length,
  skip: (page - 1) * 10,
  limit: 10,
});

const SEARCH_RESULTS = {
  posts: [
    { ...makePost(2), title: "Loving the reactive web" },
    { ...makePost(9), title: "A love letter to signals" },
  ],
  total: 2,
  skip: 0,
  limit: 10,
};

const SEARCH_EMPTY = { posts: [], total: 0, skip: 0, limit: 10 };

const USER = {
  id: 1,
  firstName: "Ada",
  lastName: "Lovelace",
  email: "ada@example.com",
  image: "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==",
  company: { title: "Engineer", name: "Analytical Engines", department: "Compute" },
};

const USER_POSTS = {
  posts: ALL_POSTS.slice(0, 3),
  total: 3,
  skip: 0,
  limit: 10,
};

test.describe("blog e2e", () => {
  const pageErrors: string[] = [];

  test.beforeEach(async ({ page }) => {
    pageErrors.length = 0;
    await page.route("**/favicon.ico", (route) => route.fulfill({ status: 200, body: "" }));
    await page.route("**/dummyjson.com/**", (route) => {
      const { pathname, searchParams } = new URL(route.request().url());
      const postMatch = pathname.match(/^\/posts\/(\d+)$/);
      const userMatch = pathname.match(/^\/users\/(\d+)$/);
      let payload: object = {};
      if (pathname === "/posts") {
        payload = listPage(Number(searchParams.get("skip") ?? "0") / 10 + 1);
      } else if (pathname === "/posts/search") {
        payload = searchParams.get("q") === "love" ? SEARCH_RESULTS : SEARCH_EMPTY;
      } else if (pathname === "/users/1/posts") {
        payload = USER_POSTS;
      } else if (pathname === "/users/1") {
        payload = USER;
      } else if (postMatch?.[1]) {
        payload = postMatch[1] === "999" ? {} : makePost(Number(postMatch[1]));
      } else if (userMatch?.[1]) {
        payload = userMatch[1] === "999" ? {} : USER;
      }
      return route.fulfill({ json: payload });
    });
    page.on("pageerror", (error) => pageErrors.push(`pageerror: ${error}`));
    page.on("console", (message) => {
      if (message.type() === "error") pageErrors.push(`console.error: ${message.text()}`);
    });
  });

  test.afterEach(() => {
    expect(pageErrors, "no page or console errors").toEqual([]);
  });

  test("the root route redirects to the post list with the mocked first page", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(`${BASE_URL}/posts`);
    await expect(page.getByRole("heading", { level: 1, name: "Posts" })).toBeVisible();
    await expect(page.getByRole("link", { name: /^Post \d+ title$/ })).toHaveCount(10);
    await expect(page.getByRole("link", { name: "Post 1 title" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Post 10 title" })).toBeVisible();
    await expect(page).toHaveTitle("Blog - Posts");
  });

  test("the list shows a loading placeholder while the request resolves", async ({ page }) => {
    await page.route("**/dummyjson.com/posts?*", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 300));
      await route.fulfill({ json: listPage(1) });
    });
    await page.goto("/");
    await expect(page.getByText("Loading posts...")).toBeVisible();
    await expect(page.getByRole("link", { name: "Post 1 title" })).toBeVisible();
  });

  test("post cards render title links, tag badges, reactions, and user links", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Post 1 title" })).toHaveAttribute(
      "href",
      "/posts/1",
    );
    await expect(page.getByText("tag1a")).toBeVisible();
    await expect(page.getByText("tag1b")).toBeVisible();
    await expect(page.getByText("1 likes • 10 views")).toBeVisible();
    await expect(page.getByRole("link", { name: /^User 1$/ })).toHaveAttribute("href", "/users/1");
    await expect(page.getByRole("link", { name: "Post 10 title" })).toHaveAttribute(
      "href",
      "/posts/10",
    );
  });

  test("pressing Enter in the search input renders the matched posts", async ({ page }) => {
    await page.goto("/");
    const input = page.getByPlaceholder("Search...");
    await input.fill("love");
    await input.press("Enter");
    await expect(page.getByRole("link", { name: "Loving the reactive web" })).toBeVisible();
    await expect(page.getByRole("link", { name: "A love letter to signals" })).toBeVisible();
    await expect(page.getByRole("link", { name: /^Post \d+ title$/ })).toHaveCount(0);
  });

  test("a search with no matches shows the empty message", async ({ page }) => {
    await page.goto("/");
    const input = page.getByPlaceholder("Search...");
    await input.fill("nope");
    await input.press("Enter");
    await expect(page.getByText('No posts found "nope".')).toBeVisible();
  });

  test("clearing the search input reverts to the full list", async ({ page }) => {
    await page.goto("/");
    const input = page.getByPlaceholder("Search...");
    await input.fill("love");
    await input.press("Enter");
    await expect(page.getByRole("link", { name: "Loving the reactive web" })).toBeVisible();
    await input.fill("");
    await input.press("Backspace");
    await expect(page.getByRole("link", { name: /^Post \d+ title$/ })).toHaveCount(10);
    await expect(page.getByRole("link", { name: "Loving the reactive web" })).toHaveCount(0);
  });

  test("pagination navigates from page 1 to page 2 and prev starts disabled", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Page 1 of 3")).toBeVisible();
    await expect(page.getByRole("button", { name: "Prev" })).toBeDisabled();
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page).toHaveURL(`${BASE_URL}/posts?page=2`);
    await expect(page.getByText("Page 2 of 3")).toBeVisible();
    await expect(page.getByRole("link", { name: /^Post \d+ title$/ })).toHaveCount(10);
    await expect(page.getByRole("link", { name: "Post 11 title" })).toBeVisible();
  });

  test("next is disabled on the last page", async ({ page }) => {
    await page.goto("/posts?page=3");
    await expect(page.getByText("Page 3 of 3")).toBeVisible();
    await expect(page.getByRole("link", { name: "Post 21 title" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Next" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Prev" })).toBeEnabled();
  });

  test("clicking a post title opens the post detail", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Post 5 title" }).click();
    await expect(page).toHaveURL(`${BASE_URL}/posts/5`);
    await expect(page).toHaveTitle("Blog - Post 5");
    await expect(page.getByText("Full body of post 5.")).toBeVisible();
    await expect(page.getByText("tag5a")).toBeVisible();
    await expect(page.getByText("5 likes • 50 views")).toBeVisible();
    await expect(page.getByRole("link", { name: /Back to posts/ })).toBeVisible();
  });

  test("an unknown post id shows the not-found placeholder", async ({ page }) => {
    await page.goto("/posts/999");
    await expect(page.getByText("Post not found")).toBeVisible();
  });

  test("clicking a user link opens the profile with recent posts", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /^User 1$/ }).click();
    await expect(page).toHaveURL(`${BASE_URL}/users/1`);
    // The compiler drops the whitespace-only text node between JSX expressions,
    // so `{firstName} {lastName}` renders as the single glued text "AdaLovelace".
    await expect(page.getByRole("heading", { name: "AdaLovelace" })).toBeVisible();
    await expect(page.getByText("ada@example.com")).toBeVisible();
    await expect(page.getByText("Engineer at Analytical Engines")).toBeVisible();
    await expect(page.getByRole("img", { name: "Ada Lovelace" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Recent Posts" })).toBeVisible();
    await expect(page.getByRole("link", { name: /^Post [123] title$/ })).toHaveCount(3);
  });

  test("an unknown user id shows the not-found placeholder", async ({ page }) => {
    await page.goto("/users/999");
    await expect(page.getByText("User not found.")).toBeVisible();
  });

  test("an unknown route falls back to the post list", async ({ page }) => {
    await page.goto("/does-not-exist");
    await expect(page).toHaveURL(`${BASE_URL}/does-not-exist`);
    await expect(page.getByRole("link", { name: /^Post \d+ title$/ })).toHaveCount(10);
    await expect(page.getByRole("link", { name: "Post 1 title" })).toBeVisible();
  });

  test("the back link returns to the post list", async ({ page }) => {
    await page.goto("/posts/5");
    await expect(page.getByText("Full body of post 5.")).toBeVisible();
    await page.getByRole("link", { name: /Back to posts/ }).click();
    await expect(page).toHaveURL(`${BASE_URL}/posts`);
    await expect(page.getByRole("link", { name: /^Post \d+ title$/ })).toHaveCount(10);
    await expect(page.getByRole("link", { name: "Post 5 title" })).toBeVisible();
  });
});
