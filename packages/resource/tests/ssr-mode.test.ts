import { describe, test, expect, beforeEach, mock } from "bun:test";
import { delay, resetTestState } from "@utils/test-helpers.js";
import { resource } from "@hellajs/resource/bundle";

describe("resource", () => {
  describe("ssr mode", () => {
    beforeEach(() => {
      resetTestState();
    });

    const withoutWindow = (fn: () => void) => {
      const saved = globalThis.window;
      globalThis.window = undefined as unknown as typeof window;
      try {
        fn();
      } finally {
        globalThis.window = saved;
      }
    };

    test("does not call the fetcher when window is undefined", () => {
      withoutWindow(() => {
        const fetcher = mock(async () => 1);
        const r = resource(fetcher);
        r.fetch();
        expect(fetcher).not.toHaveBeenCalled();
        r.dispose();
      });
    });

    test("registers no focus listener and does not throw when window is undefined", () => {
      withoutWindow(() => {
        const fetcher = mock(async () => 1);
        const r = resource(fetcher, { refetchOnWindowFocus: true });
        expect(fetcher).not.toHaveBeenCalled();
        r.dispose();
      });
    });

    test("calls the fetcher normally when window is present", async () => {
      const fetcher = mock(async () => 1);
      const r = resource(fetcher);
      r.fetch();
      await delay();
      expect(fetcher).toHaveBeenCalled();
      r.dispose();
    });
  });
});
