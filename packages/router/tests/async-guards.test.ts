import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import { effect } from "@hellajs/core";
import { delay, suppressConsole } from "@utils/test-helpers.js";
import { router, navigate, route } from "@hellajs/router/bundle";
import { setupRouterEnv, expectLoggedError } from "./helpers";

describe("router", () => {
  describe("async guards", () => {
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

    /** A guard verdict held in flight until the test releases it. */
    const hold = (): { promise: Promise<unknown>; release: (v: unknown) => void } => {
      let release!: (v: unknown) => void;
      const promise = new Promise<unknown>((res) => { release = res; });
      return { promise, release };
    };

    test("async before resolving false cancels the navigation after resolution", async () => {
      const held = hold();
      const handler = mock(() => {});
      router({
        routes: {
          "/": () => {},
          "/secret": { before: () => held.promise, handler }
        }
      });

      navigate("/");
      const len = history.length;

      navigate("/secret");
      expect(route().pending).toBe(true);
      expect(window.location.pathname).toBe("/");

      held.release(false);
      await delay(0);

      expect(handler).not.toHaveBeenCalled();
      expect(route().path).toBe("/");
      expect(window.location.pathname).toBe("/");
      expect(history.length).toBe(len);
    });

    test("async before resolving a string redirects via replace after resolution", async () => {
      const held = hold();
      const secretHandler = mock(() => {});
      const loginHandler = mock(() => {});
      router({
        routes: {
          "/": () => {},
          "/secret": { before: () => held.promise, handler: secretHandler },
          "/login": loginHandler
        }
      });

      navigate("/");
      const len = history.length;

      navigate("/secret");
      held.release("/login");
      await delay(0);

      expect(secretHandler).not.toHaveBeenCalled();
      expect(loginHandler).toHaveBeenCalledTimes(1);
      expect(route().path).toBe("/login");
      expect(window.location.pathname).toBe("/login");
      expect(history.length).toBe(len);
    });

    test("async pass commits exactly once with one history entry", async () => {
      const held = hold();
      const handler = mock(() => {});
      router({
        routes: {
          "/": () => {},
          "/x": { before: () => held.promise, handler }
        }
      });

      const tracker = mock(() => { route().path; });
      effect(tracker);
      tracker.mockClear();
      const len = history.length;

      navigate("/x");
      held.release(true);
      await delay(0);

      // One pending write, then one atomic commit write — never a torn mix.
      expect(tracker).toHaveBeenCalledTimes(2);
      expect(handler).toHaveBeenCalledTimes(1);
      expect(history.length).toBe(len + 1);
      expect(route().path).toBe("/x");
      expect(route().pending).toBe(false);
    });

    test("pending flips true on deferral and back false on commit and cancel", async () => {
      const first = hold();
      const second = hold();
      router({
        routes: {
          "/": () => {},
          "/x": {
            before: () => {
              const path = route().path;
              return path === "/" ? first.promise : second.promise;
            },
            handler: () => {}
          }
        }
      });

      expect(route().pending).toBe(false);
      navigate("/x");
      expect(route().pending).toBe(true);
      first.release(true);
      await delay(0);
      expect(route().pending).toBe(false);

      navigate("/x");
      expect(route().pending).toBe(true);
      second.release(false);
      await delay(0);
      expect(route().pending).toBe(false);
    });

    test("a newer navigation during flight supersedes the deferred one", async () => {
      const held = hold();
      const aHandler = mock(() => {});
      const bHandler = mock(() => {});
      router({
        routes: {
          "/": () => {},
          "/a": { before: () => held.promise, handler: aHandler },
          "/b": bHandler
        }
      });

      const len = history.length;
      navigate("/a");
      expect(route().pending).toBe(true);

      navigate("/b");
      expect(route().path).toBe("/b");
      expect(route().pending).toBe(false);

      held.release(true);
      await delay(0);

      expect(aHandler).not.toHaveBeenCalled();
      expect(route().path).toBe("/b");
      expect(route().pending).toBe(false);
      expect(history.length).toBe(len + 1);
    });

    test("popstate into a deferring guard restores the URL after cancellation", async () => {
      const held = hold();
      router({
        routes: {
          "/": () => {},
          "/secret": { before: () => held.promise, handler: () => {} }
        }
      });

      navigate("/");
      history.pushState(null, "", "/secret");
      window.dispatchEvent(new Event("popstate"));

      expect(route().pending).toBe(true);
      expect(window.location.pathname).toBe("/secret");

      held.release(false);
      await delay(0);

      expect(window.location.pathname).toBe("/");
      expect(route().path).toBe("/");
      expect(route().pending).toBe(false);
    });

    test("server url mode proceeds on async guards and logs rejections", async () => {
      const saved = globalThis.window;
      (globalThis as unknown as { window: unknown }).window = undefined;
      const handler = mock(() => {});
      let info: ReturnType<typeof router>;
      try {
        info = router({
          routes: {
            "/x": {
              before: () => Promise.reject(new Error("server nope")),
              handler
            }
          },
          url: "/x"
        });
      } finally {
        (globalThis as unknown as { window: unknown }).window = saved;
      }

      expect(info.path).toBe("/x");
      expect(info.pending).toBe(false);
      expect(handler).toHaveBeenCalledTimes(1);

      await delay(0);
      expectLoggedError(sup, "[router] hook:", "server nope");
    });

    test("cross-await redirect loops cap at 20 async hops and cancel", async () => {
      const aHandler = mock(() => {});
      const bHandler = mock(() => {});
      router({
        routes: {
          "/": () => {},
          "/a": { before: async () => "/b", handler: aHandler },
          "/b": { before: async () => "/a", handler: bHandler }
        }
      });

      navigate("/a");
      await delay(0);

      expectLoggedError(sup, "[router] async redirect loop detected:");
      expect(aHandler).not.toHaveBeenCalled();
      expect(bHandler).not.toHaveBeenCalled();
      expect(route().path).toBe("/");
      expect(route().pending).toBe(false);
    });

    test("handler and after hooks run only after the deferred commit", async () => {
      const held = hold();
      const handler = mock(() => {});
      const after = mock(() => {});
      const globalAfter = mock(() => {});
      router({
        routes: {
          "/": () => {},
          "/x": { before: () => held.promise, handler, after }
        },
        hooks: { after: globalAfter }
      });

      navigate("/x");
      handler.mockClear();
      after.mockClear();
      globalAfter.mockClear();
      expect(handler).not.toHaveBeenCalled();
      expect(after).not.toHaveBeenCalled();
      expect(globalAfter).not.toHaveBeenCalled();

      held.release(true);
      await delay(0);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(after).toHaveBeenCalledTimes(1);
      expect(globalAfter).toHaveBeenCalledTimes(1);
    });

    test("async leave guard blocks the navigation until resolution", async () => {
      const held = hold();
      const dashHandler = mock(() => {});
      router({
        routes: {
          "/editor": { leave: () => held.promise, handler: () => {} },
          "/dashboard": dashHandler
        }
      });

      navigate("/editor");
      const len = history.length;

      navigate("/dashboard");
      expect(route().pending).toBe(true);
      expect(route().path).toBe("/editor");
      expect(window.location.pathname).toBe("/editor");

      held.release(false);
      await delay(0);

      expect(dashHandler).not.toHaveBeenCalled();
      expect(route().path).toBe("/editor");
      expect(window.location.pathname).toBe("/editor");
      expect(history.length).toBe(len);
      expect(route().pending).toBe(false);
    });
  });
});
