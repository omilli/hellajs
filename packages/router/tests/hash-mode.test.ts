import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
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
      const originalWindow = global.window;
      const mockAddEventListener = mock(() => { });

      global.window = {
        addEventListener: mockAddEventListener,
        location: {
          pathname: "/",
          search: "",
          hash: "#/test"
        }
      } as unknown as typeof global.window;

      try {
        router({
          routes: {
            "/test": () => render("test-page")
          },
          mode: "hash"
        });

        expect(mockAddEventListener).toHaveBeenCalledWith("hashchange", expect.any(Function));
      } finally {
        global.window = originalWindow;
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
  });
});
