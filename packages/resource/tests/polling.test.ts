import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import { effect } from "@hellajs/core";
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

    test("requires refetchOnKeyChange to poll", async () => {
      const fetcher = mock(() => delay(5).then(() => `data-${fetcher.mock.calls.length}`));
      const r = resource(fetcher, {
        refetchInterval: 30,
      });

      effect(() => { r.status(); });
      await delay(80);

      expect(fetcher).toHaveBeenCalledTimes(0);
      r.dispose();
    });

    test.each(["abort", "reset"] as const)("stops polling on %s", async (method) => {
      const fetcher = mock(() => delay(5).then(() => `data-${fetcher.mock.calls.length}`));
      const r = resource(fetcher, {
        refetchInterval: 20,
        refetchOnKeyChange: true,
      });

      effect(() => { r.status(); });
      await delay(50);
      r[method]();
      const countAfter = fetcher.mock.calls.length;

      await delay(50);
      expect(fetcher.mock.calls.length).toBe(countAfter);
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
  });
});
