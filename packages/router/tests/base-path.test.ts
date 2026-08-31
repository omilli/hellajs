import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { router, navigate, route, resetRouter } from "@hellajs/router/bundle";
import { setupRouterEnv } from "./helpers";

describe("router", () => {
  describe("base path", () => {
    let origHref: string;

    beforeEach(() => {
      origHref = window.location.href;
      setupRouterEnv();
      resetRouter();
      window.location.href = "http://localhost/app/users/7";
    });

    afterEach(() => {
      window.location.href = origHref;
    });

    test("strips the base from the initial URL", () => {
      router({
        base: "/app",
        routes: { "/users/:id": () => {} }
      });

      expect(route().path).toBe("/users/7");
      expect(route().params.id).toBe("7");
    });

    test("commits navigate targets with the base prefix", () => {
      router({
        base: "/app",
        routes: { "/users/:id": () => {} }
      });

      navigate("/users/:id", { params: { id: "7" } });

      expect(window.location.pathname).toBe("/app/users/7");
      expect(route().path).toBe("/users/7");
    });

    test("routes intercepted base-prefixed anchor clicks logically", () => {
      router({
        base: "/app",
        routes: { "/users/:id": () => {} }
      });

      const el = document.createElement("a");
      el.href = "/app/users/8";
      document.body.appendChild(el);

      const event = new MouseEvent("click", { bubbles: true, cancelable: true });
      el.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(true);
      expect(route().path).toBe("/users/8");
    });

    test("resolves popstate against the stripped path", () => {
      router({
        base: "/app",
        routes: { "/users/:id": () => {} }
      });

      history.pushState(null, "", "/app/users/9");
      window.dispatchEvent(new Event("popstate"));

      expect(route().path).toBe("/users/9");
      expect(window.location.pathname).toBe("/app/users/9");
    });

    test("strips the base from the url option with query preserved", () => {
      router({
        base: "/app",
        url: "/app/users/7?q=1",
        routes: { "/users/:id": () => {} }
      });

      expect(route().path).toBe("/users/7?q=1");
      expect(route().query.q).toBe("1");
    });

    test("strips an exact-base URL to the logical root", () => {
      router({
        base: "/app",
        url: "/app",
        routes: { "/": () => {} }
      });

      expect(route().path).toBe("/");
    });

    test("strips an exact-base URL with a query to the root", () => {
      router({
        base: "/app",
        url: "/app?tab=1",
        routes: { "/": () => {} }
      });

      expect(route().path).toBe("/?tab=1");
      expect(route().query.tab).toBe("1");
    });

    test("leaves paths outside the base unchanged", () => {
      router({
        base: "/app",
        url: "/outside/page",
        routes: { "/outside/page": () => {} }
      });

      expect(route().path).toBe("/outside/page");
    });

    test("normalizes a trailing slash in the base", () => {
      router({
        base: "/app/",
        routes: { "/users/:id": () => {} }
      });

      navigate("/users/7");

      expect(window.location.pathname).toBe("/app/users/7");
      expect(route().path).toBe("/users/7");
    });

    test("ignores the base in hash mode", () => {
      router({
        mode: "hash",
        base: "/app",
        routes: { "/about": () => {} }
      });

      navigate("/about");

      expect(window.location.hash).toBe("#/about");
      expect(route().path).toBe("/about");
    });

    test.each(["app", "app/", "", 123])("throws when base is %s", (invalidBase) => {
      expect(() =>
        router({
          routes: {},
          // @ts-expect-error - intentionally invalid: base must be '/'-prefixed
          base: invalidBase
        })
      ).toThrow("[router] router: base must be a '/'-prefixed string");
    });
  });
});
