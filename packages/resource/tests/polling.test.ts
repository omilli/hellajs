import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import { effect, signal } from "@hellajs/core";
import { delay, resetTestState } from "@utils/test-helpers.js";
import { resource } from "@hellajs/resource/bundle";

let originalVisibility: string;

describe("resource", () => {
  describe("polling", () => {
    beforeEach(() => {
      resetTestState();
      originalVisibility = document.visibilityState;
    });

    afterEach(() => {
      Object.defineProperty(document, "visibilityState", {
        value: originalVisibility,
        writable: true,
        configurable: true,
      });
    });

    test("polls at interval with refetchOnKeyChange", async () => {
      const fetcher = mock(() => delay(5).then(() => `data-${fetcher.mock.calls.length}`));
      const r = resource(fetcher, {
        refetchInterval: 30,
        refetchOnKeyChange: true,
      });

      effect(() => { r.status(); });
      await delay(100);

      expect(fetcher.mock.calls.length).toBeGreaterThanOrEqual(2);
      r.dispose();
    });

    test("polls without refetchOnKeyChange", async () => {
      const fetcher = mock(() => delay(5).then(() => `data-${fetcher.mock.calls.length}`));
      const r = resource(fetcher, {
        refetchInterval: 30,
      });

      effect(() => { r.status(); });
      await delay(100);

      expect(fetcher.mock.calls.length).toBeGreaterThanOrEqual(2);
      r.dispose();
    });

    test("stops polling on abort", async () => {
      const fetcher = mock(() => delay(5).then(() => `data-${fetcher.mock.calls.length}`));
      const r = resource(fetcher, {
        refetchInterval: 20,
        refetchOnKeyChange: true,
      });

      effect(() => { r.status(); });
      await delay(50);
      r.abort();
      const countAfter = fetcher.mock.calls.length;

      await delay(50);
      expect(fetcher.mock.calls.length).toBe(countAfter);
      r.dispose();
    });

    test("restarts polling after reset", async () => {
      const fetcher = mock(() => delay(5).then(() => `data-${fetcher.mock.calls.length}`));
      const r = resource(fetcher, {
        refetchInterval: 20,
        refetchOnKeyChange: true,
      });

      effect(() => { r.status(); });
      await delay(50);
      r.reset();
      const countAfterReset = fetcher.mock.calls.length;

      await delay(50);
      expect(fetcher.mock.calls.length).toBeGreaterThan(countAfterReset);
      r.dispose();
    });

    test("dynamic interval based on data", async () => {
      let dataCount = 0;
      const fetcher = mock(() => delay(5).then(() => ({ status: dataCount++ > 0 ? "healthy" : "unhealthy" })));
      const r = resource(
        fetcher,
        {
          refetchInterval: (data) => (!data ? 20 : data.status === "unhealthy" ? 20 : 100),
          refetchOnKeyChange: true,
        }
      );

      effect(() => { r.status(); });
      await delay(60);

      expect(fetcher.mock.calls.length).toBeGreaterThanOrEqual(2);
      r.dispose();
    });

    test.each([false, 0])("refetchInterval %p disables polling", async (value) => {
      const fetcher = mock(() => delay(5).then(() => `data-${fetcher.mock.calls.length}`));
      const r = resource(fetcher, {
        refetchInterval: value as false | 0,
        refetchOnKeyChange: true,
      });

      effect(() => { r.status(); });
      await delay(80);

      expect(fetcher).toHaveBeenCalledTimes(1);
      r.dispose();
    });

    test("respects enabled: false", async () => {
      const fetcher = mock(() => delay(5).then(() => `data-${fetcher.mock.calls.length}`));
      const r = resource(fetcher, {
        refetchInterval: 20,
        refetchOnKeyChange: true,
        enabled: false,
      });

      effect(() => { r.status(); });
      await delay(80);

      expect(fetcher).toHaveBeenCalledTimes(0);
      r.dispose();
    });

    const setHidden = () => {
      Object.defineProperty(document, "visibilityState", {
        value: "hidden",
        writable: true,
        configurable: true,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    };

    const setVisible = () => {
      Object.defineProperty(document, "visibilityState", {
        value: "visible",
        writable: true,
        configurable: true,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    };

    test("pauses when hidden, resumes when visible", async () => {
      const fetcher = mock(() => delay(5).then(() => `data-${fetcher.mock.calls.length}`));
      const r = resource(fetcher, {
        refetchInterval: 20,
        refetchOnKeyChange: true,
      });

      effect(() => { r.status(); });
      await delay(50);
      expect(fetcher.mock.calls.length).toBeGreaterThanOrEqual(1);

      setHidden();
      const countWhenHidden = fetcher.mock.calls.length;
      await delay(60);
      expect(fetcher.mock.calls.length).toBe(countWhenHidden);

      setVisible();
      await delay(50);
      expect(fetcher.mock.calls.length).toBeGreaterThan(countWhenHidden);

      r.dispose();
    });

    test("continues polling in background when enabled", async () => {
      const fetcher = mock(() => delay(5).then(() => `data-${fetcher.mock.calls.length}`));
      const r = resource(fetcher, {
        refetchInterval: 20,
        refetchIntervalInBackground: true,
        refetchOnKeyChange: true,
      });

      effect(() => { r.status(); });
      await delay(50);

      setHidden();
      const countWhenHidden = fetcher.mock.calls.length;
      await delay(70);
      expect(fetcher.mock.calls.length).toBeGreaterThan(countWhenHidden);

      r.dispose();
    });

    test("arms polling when enabled getter flips true", async () => {
      const flag = signal(false);
      const fetcher = mock(() => delay(5).then(() => `data-${fetcher.mock.calls.length}`));
      const r = resource(fetcher, {
        refetchInterval: 20,
        refetchOnKeyChange: true,
        enabled: () => flag(),
      });

      effect(() => { r.status(); });
      await delay(40);
      expect(fetcher.mock.calls.length).toBe(0);

      flag(true);
      await delay(200);

      // 1 auto-fetch on flip + multiple interval ticks — pre-fix this was exactly 1.
      expect(fetcher.mock.calls.length).toBeGreaterThanOrEqual(4);
      r.dispose();
    });

    test("arms polling when enabled getter flips true without refetchOnKeyChange", async () => {
      const flag = signal(false);
      const fetcher = mock(() => delay(5).then(() => `data-${fetcher.mock.calls.length}`));
      const r = resource(fetcher, {
        refetchInterval: 20,
        enabled: () => flag(),
      });

      effect(() => { r.status(); });
      await delay(40);
      expect(fetcher.mock.calls.length).toBe(0);

      flag(true);
      await delay(100);

      // Interval ticks only — no auto-fetch without refetchOnKeyChange.
      expect(fetcher.mock.calls.length).toBeGreaterThanOrEqual(2);
      r.dispose();
    });

    test("does not reset polling cadence on key change", async () => {
      const keySignal = signal("a");
      const fetcher = mock(() => delay(5).then(() => `data-${fetcher.mock.calls.length}`));
      const r = resource(fetcher, {
        refetchInterval: 20,
        refetchOnKeyChange: true,
        key: () => keySignal(),
      });

      effect(() => { r.status(); });
      await delay(40);
      keySignal("b"); // mid-window key change; cadence restart would lose ticks
      await delay(160);

      // ~10 interval slots at 20ms + 1 extra from the key-change fetch.
      expect(fetcher.mock.calls.length).toBeGreaterThanOrEqual(8);
      r.dispose();
    });

    test("polling stays stopped after abort()", async () => {
      const fetcher = mock(() => delay(5).then(() => `data-${fetcher.mock.calls.length}`));
      const r = resource(fetcher, {
        refetchInterval: 20,
        refetchOnKeyChange: true,
      });

      effect(() => { r.status(); });
      await delay(50);
      expect(fetcher.mock.calls.length).toBeGreaterThanOrEqual(1);

      r.abort();
      const countAfterAbort = fetcher.mock.calls.length;
      await delay(80);
      expect(fetcher.mock.calls.length).toBe(countAfterAbort);

      r.dispose();
    });
  });
});
