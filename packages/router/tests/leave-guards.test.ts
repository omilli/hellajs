import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import { delay, suppressConsole } from "@utils/test-helpers.js";
import { router, navigate, route, resetRouter } from "@hellajs/router/bundle";
import { setupRouterEnv, expectLoggedError } from "./helpers";

describe("router", () => {
  describe("leave guards", () => {
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

    test("leave runs global first, then child to parent", () => {
      const globalLeave = mock(() => {});
      const parentLeave = mock(() => {});
      const childLeave = mock(() => {});
      router({
        hooks: { leave: globalLeave },
        routes: {
          "/editor": {
            leave: parentLeave,
            children: { "/doc": { leave: childLeave, handler: () => {} } }
          },
          "/dashboard": () => {}
        }
      });

      navigate("/editor/doc");
      navigate("/dashboard");

      expect(globalLeave).toHaveBeenCalledTimes(1);
      expect(parentLeave).toHaveBeenCalledTimes(1);
      expect(childLeave).toHaveBeenCalledTimes(1);
      expect(globalLeave.mock.invocationCallOrder[0]!).toBeLessThan(childLeave.mock.invocationCallOrder[0]!);
      expect(childLeave.mock.invocationCallOrder[0]!).toBeLessThan(parentLeave.mock.invocationCallOrder[0]!);
    });

    test("global leave returning false cancels before per-route leave runs", () => {
      const leave = mock(() => {});
      const dashboardHandler = mock(() => {});
      router({
        hooks: { leave: () => false },
        routes: {
          "/editor": { leave, handler: () => {} },
          "/dashboard": dashboardHandler
        }
      });

      navigate("/editor");

      navigate("/dashboard");

      expect(leave).not.toHaveBeenCalled();
      expect(dashboardHandler).not.toHaveBeenCalled();
      expect(route().path).toBe("/editor");
    });

    test("global leave throwing cancels and logs", () => {
      const dashboardHandler = mock(() => {});
      router({
        hooks: { leave: () => { throw new Error("global leave nope"); } },
        routes: {
          "/editor": { handler: () => {} },
          "/dashboard": dashboardHandler
        }
      });

      navigate("/editor");

      navigate("/dashboard");

      expect(dashboardHandler).not.toHaveBeenCalled();
      expect(route().path).toBe("/editor");
      expectLoggedError(sup, "[router] Global leave:", "global leave nope");
    });

    test("leave returning false cancels navigation with no URL change", () => {
      const dashboardHandler = mock(() => {});
      router({
        routes: {
          "/editor": {
            leave: () => false,
            children: { "/doc": { handler: () => {} } }
          },
          "/dashboard": { children: { "/home": { handler: dashboardHandler } } }
        }
      });

      navigate("/editor/doc");
      const len = history.length;

      navigate("/dashboard/home");

      expect(dashboardHandler).not.toHaveBeenCalled();
      expect(route().path).toBe("/editor/doc");
      expect(window.location.pathname).toBe("/editor/doc");
      expect(history.length).toBe(len);
    });

    test("leave returning a string redirects via replace", () => {
      let dirty = true;
      const saveHandler = mock(() => {});
      const dashboardHandler = mock(() => {});
      router({
        routes: {
          "/editor": {
            leave: () => {
              if (!dirty) return;
              dirty = false;
              return "/save";
            },
            handler: () => {}
          },
          "/save": saveHandler,
          "/dashboard": dashboardHandler
        }
      });

      navigate("/editor");
      const len = history.length;

      navigate("/dashboard");

      expect(route().path).toBe("/save");
      expect(saveHandler).toHaveBeenCalledTimes(1);
      expect(dashboardHandler).not.toHaveBeenCalled();
      expect(history.length).toBe(len);
    });

    test("force skips leave while incoming before still runs", () => {
      const leave = mock(() => false);
      const before = mock(() => {});
      const dashboardHandler = mock(() => {});
      router({
        routes: {
          "/editor": { leave, handler: () => {} },
          "/dashboard": { before, handler: dashboardHandler }
        }
      });

      navigate("/editor");
      navigate("/dashboard", { force: true });

      expect(leave).not.toHaveBeenCalled();
      expect(before).toHaveBeenCalledTimes(1);
      expect(dashboardHandler).toHaveBeenCalledTimes(1);
      expect(route().path).toBe("/dashboard");
    });

    test("same-path navigation skips leave entirely", () => {
      const leave = mock(() => false);
      router({
        routes: {
          "/editor": { leave, handler: () => {} }
        }
      });

      navigate("/editor");
      navigate("/editor", { query: { tab: "settings" } });

      expect(leave).not.toHaveBeenCalled();
      expect(route().path).toBe("/editor?tab=settings");
    });

    test("popstate into a failing leave guard restores the previous URL", () => {
      router({
        routes: {
          "/editor": { leave: () => false, handler: () => {} },
          "/dashboard": () => {}
        }
      });

      navigate("/editor");
      history.pushState(null, "", "/dashboard");
      window.dispatchEvent(new Event("popstate"));

      expect(window.location.pathname).toBe("/editor");
      expect(route().path).toBe("/editor");
    });

    test("leave does not run when the router resolves its initial route", () => {
      const leave = mock(() => {});
      const handler = mock(() => {});
      window.location.href = "http://localhost/editor";

      router({ routes: { "/editor": { leave, handler } } });

      expect(leave).not.toHaveBeenCalled();
      expect(handler).toHaveBeenCalledTimes(1);
      expect(route().path).toBe("/editor");
    });

    test("resetRouter clears the chain so post-reset navigation fires no old leaves", () => {
      const leave = mock(() => false);
      const dashboardHandler = mock(() => {});
      router({
        routes: {
          "/editor": { leave, handler: () => {} },
          "/dashboard": dashboardHandler
        }
      });

      navigate("/editor");
      resetRouter();
      router({
        routes: {
          "/editor": { handler: () => {} },
          "/dashboard": dashboardHandler
        }
      });

      navigate("/dashboard");

      expect(leave).not.toHaveBeenCalled();
      expect(dashboardHandler).toHaveBeenCalledTimes(1);
      expect(route().path).toBe("/dashboard");
    });

    test("leave returning a Promise proceeds without blocking", async () => {
      const leave = mock(() => Promise.reject(new Error("async leave nope")));
      const dashboardHandler = mock(() => {});
      router({
        routes: {
          "/editor": { leave, handler: () => {} },
          "/dashboard": dashboardHandler
        }
      });

      navigate("/editor");
      navigate("/dashboard");

      expect(dashboardHandler).toHaveBeenCalledTimes(1);
      expect(route().path).toBe("/dashboard");
      await delay();
      expectLoggedError(sup, "[router] leave:", "async leave nope");
    });
  });
});
