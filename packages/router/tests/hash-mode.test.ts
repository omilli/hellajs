import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import { effect } from "@hellajs/core";

import { router, navigate, route } from "@hellajs/router/bundle";
import { setupRouterEnv } from "./helpers";

describe("router", () => {
  describe("hash mode", () => {
    let container: HTMLDivElement;
    let render: (content: string) => void;

    beforeEach(() => {
      const env = setupRouterEnv();
      container = env.container;
      render = env.render;
      window.location.hash = "";
    });

    afterEach(() => {
      window.location.hash = "";
    });

    test("uses hash for navigation in hash mode", () => {
      router({
        routes: {
          "/": () => render("home"),
          "/about": () => render("about")
        },
        mode: "hash"
      });

      navigate("/about");
      expect(window.location.hash).toBe("#/about");
      expect(container.textContent).toBe("about");
    });

    test("handles hashchange events", () => {
      const original = window.addEventListener;
      const spy = mock(() => { });
      window.addEventListener = spy as unknown as typeof window.addEventListener;

      try {
        router({
          routes: {
            "/test": () => render("test-page")
          },
          mode: "hash"
        });

        expect(spy).toHaveBeenCalledWith("hashchange", expect.any(Function));
      } finally {
        window.addEventListener = original;
      }
    });

    test("extracts params in hash mode", () => {
      router({
        routes: {
          "/users/:id": ({ id }: { id: string }) => render(`user-${id}`)
        },
        mode: "hash"
      });

      navigate("/users/123");
      expect(container.textContent).toBe("user-123");
      expect(route().params["id"]).toBe("123");
    });

    test("handles query params in hash mode", () => {
      router({
        routes: {
          "/search": (_p: unknown, query: { q: string }) => render(`query-${query?.q}`)
        },
        mode: "hash"
      });

      navigate("/search", { query: { q: "test" } });
      expect(container.textContent).toBe("query-test");
      expect(window.location.hash).toBe("#/search?q=test");
    });

    test("ignores plain hash changes that are not route paths", () => {
      const notFoundSpy = mock(() => { });
      router({
        routes: {
          "/about": () => { }
        },
        mode: "hash",
        notFound: notFoundSpy
      });
      // Init fires notFound for the env's unmatched start path (HappyDOM quirk) —
      // isolate the dispatched hashchange from it.
      notFoundSpy.mockClear();

      const pathBefore = route().path;
      window.location.hash = "faq";
      window.dispatchEvent(new Event("hashchange"));
      expect(notFoundSpy).not.toHaveBeenCalled();
      expect(route().path).toBe(pathBefore);
    });

    test("hashchange fires route subscribers exactly once per navigation", () => {
      router({
        routes: {
          "/test": () => { },
          "/about": () => { }
        },
        mode: "hash"
      });

      const tracker = mock(() => { route().path; });
      effect(tracker);
      tracker.mockClear();
      window.location.hash = "/test";
      window.dispatchEvent(new Event("hashchange"));
      expect(tracker).toHaveBeenCalledTimes(1);
    });
  });
});
