import { describe, test, expect } from "bun:test";
import { router, navigate, route, href } from "@hellajs/router/bundle";
import { setupRouterEnv } from "./helpers";

describe("href", () => {
  test("returns the path unchanged when no options are given", () => {
    expect(href("/users")).toBe("/users");
  });

  test("URL-encodes substituted params", () => {
    expect(href("/search/:term", { params: { term: "hello world & more!" } }))
      .toBe("/search/hello%20world%20%26%20more!");
  });

  test("inserts wildcard values raw with slashes preserved", () => {
    expect(href("/files/*", { params: { "*": "docs/readme.md" } }))
      .toBe("/files/docs/readme.md");
  });

  test("strips unmatched param tokens", () => {
    expect(href("/users/:id")).toBe("/users/");
  });

  test("ignores prefix-colliding param keys and strips the token", () => {
    // @ts-expect-error - intentionally mismatched: key is a prefix of the token
    expect(href("/users/:idx", { params: { id: "7" } })).toBe("/users/");
  });

  test("ignores param keys longer than the token", () => {
    // @ts-expect-error - intentionally mismatched: key outlives the token
    expect(href("/users/:id", { params: { idx: "7" } })).toBe("/users/");
  });

  test("substitutes multiple params across segments", () => {
    expect(href("/users/:id/posts/:postId", { params: { id: "1", postId: "2" } }))
      .toBe("/users/1/posts/2");
  });

  test("serializes query encoded and omits the ? for empty query", () => {
    expect(href("/search", { query: { q: "hello world", "a&b": "c=d" } }))
      .toBe("/search?q=hello%20world&a%26b=c%3Dd");
    expect(href("/search", { query: {} })).toBe("/search");
  });

  test("produces navigate-parity URLs for params and query combined", () => {
    const env = setupRouterEnv();
    router({
      routes: {
        "/users/:id": () => env.render("user")
      }
    });

    navigate("/users/:id", { params: { id: "hello world" }, query: { tab: "profile & posts" } });
    expect(href("/users/:id", { params: { id: "hello world" }, query: { tab: "profile & posts" } }))
      .toBe(route().path);
  });

  test("throws when path is null", () => {
    expect(() =>
      // @ts-expect-error - intentionally invalid: null path
      href(null)
    ).toThrow("[router] href: path must be a string, received null");
  });
});
