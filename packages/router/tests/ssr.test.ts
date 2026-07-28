import { describe, test, expect, beforeEach, mock } from "bun:test";

import { router, route } from "@hellajs/router/bundle";
import { setupRouterEnv } from "./helpers";

describe("router", () => {
  describe("ssr / url option", () => {
    beforeEach(() => {
      setupRouterEnv();
    });

    test("resolves the initial route synchronously on router()", () => {
      const home = mock(() => { });

      router({
        routes: {
          "/": home
        },
        url: "/"
      });

      // No flush()/await — route() is already resolved when router() returns.
      expect(route().path).toBe("/");
      expect(route().handler).toBe(home);
    });

    test("resolves against the url option instead of window.location", () => {
      const home = mock(() => { });
      const about = mock(() => { });

      router({
        routes: {
          "/": home,
          "/about": about
        },
        url: "/about"
      });

      expect(route().path).toBe("/about");
      expect(about).toHaveBeenCalledTimes(1);
      expect(home).not.toHaveBeenCalled();
    });

    test("extracts path params from the url option synchronously", () => {
      router({
        routes: {
          "/users/:id": () => { }
        },
        url: "/users/123"
      });

      expect(route().params["id"]).toBe("123");
    });

    test("parses the query string from the url option synchronously", () => {
      router({
        routes: {
          "/search": () => { }
        },
        url: "/search?q=hello"
      });

      expect(route().query["q"]).toBe("hello");
    });

    test("fires the matched handler exactly once during router()", () => {
      const home = mock(() => { });

      router({
        routes: {
          "/": home
        },
        url: "/"
      });

      expect(home).toHaveBeenCalledTimes(1);
    });

    test("re-resolves the url on each router() call in one process (SSR per-request)", () => {
      const home = mock(() => { });
      const users = mock(() => { });
      const routes = {
        "/": home,
        "/users/:id": users
      };

      router({ routes, url: "/users/7" });
      expect(route().path).toBe("/users/7");
      expect(users).toHaveBeenCalledTimes(1);
      expect(home).not.toHaveBeenCalled();

      // A second router({ url }) in the same process must re-resolve against the new
      // url — the first request's route must not leak into the second.
      router({ routes, url: "/" });
      expect(route().path).toBe("/");
      expect(home).toHaveBeenCalledTimes(1);
      expect(users).toHaveBeenCalledTimes(1);
    });
  });
});
