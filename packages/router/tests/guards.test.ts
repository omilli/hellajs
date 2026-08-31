import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import { delay, suppressConsole } from "@utils/test-helpers.js";
import { router, navigate, route } from "@hellajs/router/bundle";
import { setupRouterEnv, expectLoggedError } from "./helpers";

describe("router", () => {
  describe("guards", () => {
    let sup: ReturnType<typeof suppressConsole>;
    let origHref: string;

    beforeEach(() => {
      origHref = window.location.href;
      setupRouterEnv();
      window.location.href = "http://localhost/";
      sup = suppressConsole();
    });

    afterEach(() => {
      sup.restore();
      window.location.href = origHref;
    });

    test("before returning false cancels navigation with no history change", () => {
      const handler = mock(() => {});
      router({
        routes: {
          "/": () => {},
          "/secret": { before: () => false, handler }
        }
      });

      navigate("/");
      const len = history.length;

      navigate("/secret");

      expect(handler).not.toHaveBeenCalled();
      expect(route().path).toBe("/");
      expect(history.length).toBe(len);
    });

    test("mutually redirecting guards cancel instead of overflowing the stack", () => {
      router({
        routes: {
          "/a": { before: () => "/b" },
          "/b": { before: () => "/a" }
        }
      });

      navigate("/safe");
      const pathBefore = route().path;

      navigate("/a");

      expect(route().path).toBe(pathBefore);
      expectLoggedError(sup, "[router] redirect loop detected:", "exceeded 20 hops resolving /a");
    });

    test("before returning a string redirects via replace", () => {
      const secretHandler = mock(() => {});
      const loginHandler = mock(() => {});
      const len = history.length;

      router({
        routes: {
          "/secret": { before: () => "/login", handler: secretHandler },
          "/login": loginHandler
        }
      });

      navigate("/secret");

      expect(secretHandler).not.toHaveBeenCalled();
      expect(loginHandler).toHaveBeenCalledTimes(1);
      expect(route().path).toBe("/login");
      expect(history.length).toBe(len);
    });

    test("before returning true proceeds", () => {
      const handler = mock(() => {});
      router({ routes: { "/x": { before: () => true, handler } } });

      navigate("/x");

      expect(handler).toHaveBeenCalledTimes(1);
      expect(route().path).toBe("/x");
    });

    test("before returning void proceeds", () => {
      const handler = mock(() => {});
      router({ routes: { "/x": { before: () => {}, handler } } });

      navigate("/x");

      expect(handler).toHaveBeenCalledTimes(1);
    });

    test("before returning a truthy non-string proceeds", () => {
      const handler = mock(() => {});
      router({ routes: { "/x": { before: () => ({ allowed: true }), handler } } });

      navigate("/x");

      expect(handler).toHaveBeenCalledTimes(1);
    });

    test("before returning a falsy non-false value proceeds", () => {
      const handler = mock(() => {});
      router({ routes: { "/x": { before: () => 0, handler } } });

      navigate("/x");

      expect(handler).toHaveBeenCalledTimes(1);
    });

    test("before throwing cancels navigation and logs", () => {
      const handler = mock(() => {});
      router({
        routes: {
          "/": () => {},
          "/x": { before: () => { throw new Error("nope"); }, handler }
        }
      });

      navigate("/");

      navigate("/x");

      expect(handler).not.toHaveBeenCalled();
      expect(route().path).toBe("/");
      expectLoggedError(sup, "[router] hook:", "nope");
    });

    test("before returning a rejected Promise defers then cancels and logs", async () => {
      const handler = mock(() => {});
      router({
        routes: {
          "/x": {
            before: () => Promise.reject(new Error("async nope")),
            handler
          }
        }
      });

      navigate("/x");

      expect(handler).not.toHaveBeenCalled();
      expect(route().pending).toBe(true);
      await delay(0);
      expect(handler).not.toHaveBeenCalled();
      expect(route().pending).toBe(false);
      expectLoggedError(sup, "[router] hook:", "async nope");
    });

    test("global before returning false cancels before per-route before runs", () => {
      const routeBefore = mock(() => {});
      const handler = mock(() => {});
      router({
        hooks: { before: () => false },
        routes: { "/x": { before: routeBefore, handler } }
      });

      navigate("/x");

      expect(routeBefore).not.toHaveBeenCalled();
      expect(handler).not.toHaveBeenCalled();
    });

    test("global before returning a string redirects over per-route before", () => {
      const routeBefore = mock(() => {});
      let redirected = false;
      router({
        hooks: {
          before: () => {
            if (redirected) return;
            redirected = true;
            return "/login";
          }
        },
        routes: {
          "/x": { before: routeBefore, handler: () => {} },
          "/login": () => {}
        }
      });

      navigate("/x");

      expect(routeBefore).not.toHaveBeenCalled();
      expect(route().path).toBe("/login");
    });

    test("nested parent before returning false short-circuits child and handler", () => {
      const childBefore = mock(() => {});
      const handler = mock(() => {});
      router({
        routes: {
          "/parent": {
            before: () => false,
            children: { "/child": { before: childBefore, handler } }
          }
        }
      });

      navigate("/parent/child");

      expect(childBefore).not.toHaveBeenCalled();
      expect(handler).not.toHaveBeenCalled();
    });

    test("nested child before returning false cancels after parent proceeds", () => {
      const parentBefore = mock(() => {});
      const handler = mock(() => {});
      router({
        routes: {
          "/parent": {
            before: parentBefore,
            children: { "/child": { before: () => false, handler } }
          }
        }
      });

      navigate("/parent/child");

      expect(parentBefore).toHaveBeenCalledTimes(1);
      expect(handler).not.toHaveBeenCalled();
    });

    test("nested parent before returning a string redirects and skips child", () => {
      const childBefore = mock(() => {});
      router({
        routes: {
          "/parent": {
            before: () => "/login",
            children: { "/child": { before: childBefore, handler: () => {} } }
          },
          "/login": () => {}
        }
      });

      navigate("/parent/child");

      expect(childBefore).not.toHaveBeenCalled();
      expect(route().path).toBe("/login");
    });

    test("nested child before returning a string redirects", () => {
      router({
        routes: {
          "/parent": {
            before: () => {},
            children: { "/child": { before: () => "/login", handler: () => {} } }
          },
          "/login": () => {}
        }
      });

      navigate("/parent/child");

      expect(route().path).toBe("/login");
    });

    test("popstate into a failing guard restores the previous URL", () => {
      router({
        routes: {
          "/": () => {},
          "/secret": { before: () => false, handler: () => {} }
        }
      });

      navigate("/");

      history.pushState(null, "", "/secret");
      window.dispatchEvent(new Event("popstate"));

      expect(window.location.pathname).toBe("/");
      expect(route().path).toBe("/");
    });

    test("popstate into a guard redirect resolves to the redirect target", () => {
      router({
        routes: {
          "/": () => {},
          "/secret": { before: () => "/login", handler: () => {} },
          "/login": () => {}
        }
      });

      navigate("/");
      history.pushState(null, "", "/secret");
      window.dispatchEvent(new Event("popstate"));

      expect(window.location.pathname).toBe("/login");
      expect(route().path).toBe("/login");
    });

    test("hash-mode hashchange into a failing guard restores the previous hash", () => {
      router({
        mode: "hash",
        routes: {
          "/": () => {},
          "/secret": { before: () => false, handler: () => {} }
        }
      });

      navigate("/");
      history.pushState(null, "", "#/secret");
      window.dispatchEvent(new Event("hashchange"));

      expect(window.location.hash).toBe("#/");
      expect(route().path).toBe("/");
    });
  });
});
