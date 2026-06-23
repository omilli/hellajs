import { describe, test, expect, beforeEach, mock } from "bun:test";
import { router, route, navigate } from "@hellajs/router/bundle";

describe("router", () => {
  describe("atomicity", () => {
    beforeEach(() => {
      resetTestState();
      window.history.replaceState({}, "", "/");
      router({
        routes: {
          "/users/:id": () => { },
          "/about": () => { }
        }
      });
    });

    test("navigate fires route subscribers exactly once per navigation", () => {
      const tracker = mock(() => { route().path; });
      effect(tracker);
      tracker.mockClear();
      navigate("/users/123");
      expect(tracker).toHaveBeenCalledTimes(1);
    });

    test("route signal never exposes stale handler alongside new path", () => {
      const snapshots: Array<{ path: string; handler: unknown }> = [];
      effect(() => { snapshots.push({ path: route().path, handler: route().handler }); });
      navigate("/users/123");
      navigate("/about");

      let i = 0;
      const len = snapshots.length;
      while (i < len) {
        const s = snapshots[i]!;
        if (s.path === "/users/123") {
          expect(s.handler).not.toBeNull();
        }
        if (s.path === "/about") {
          expect(s.handler).not.toBeNull();
        }
        i++;
      }
    });

    test("popstate fires route subscribers exactly once per navigation", () => {
      const tracker = mock(() => { route().path; });
      effect(tracker);
      tracker.mockClear();
      history.pushState({}, "", "/users/123");
      window.dispatchEvent(new Event("popstate"));
      expect(tracker).toHaveBeenCalledTimes(1);
    });
  });
});
