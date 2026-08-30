import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import { effect } from "@hellajs/core";
import { delay, resetTestState } from "@utils/test-helpers.js";
import { resource } from "@hellajs/resource/bundle";

describe("resource", () => {
  describe("focus", () => {
    let originalVisibility: string;

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

    const setVisibility = (state: "visible" | "hidden") => {
      Object.defineProperty(document, "visibilityState", {
        value: state,
        writable: true,
        configurable: true,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    };

    test("refetches when tab becomes visible", async () => {
      const fetcher = mock(() => delay(5).then(() => `data-${fetcher.mock.calls.length}`));
      const r = resource(fetcher, {
        refetchOnWindowFocus: true,
        refetchOnKeyChange: true,
      });

      effect(() => { r.status(); });
      await delay(20);

      expect(fetcher).toHaveBeenCalledTimes(1);

      // Simulate tab hidden then visible
      setVisibility("hidden");
      setVisibility("visible");

      await delay(20);

      expect(fetcher).toHaveBeenCalledTimes(2);

      r.dispose();
    });

    test("refetches on window focus event", async () => {
      const fetcher = mock(() => delay(5).then(() => `data-${fetcher.mock.calls.length}`));
      const r = resource(fetcher, {
        refetchOnWindowFocus: true,
        refetchOnKeyChange: true,
      });

      effect(() => { r.status(); });
      await delay(20);

      expect(fetcher).toHaveBeenCalledTimes(1);

      window.dispatchEvent(new Event("focus"));

      await delay(20);

      expect(fetcher).toHaveBeenCalledTimes(2);

      r.dispose();
    });

    test("deduplicates back-to-back visibility and focus triggers", async () => {
      const fetcher = mock(() => delay(5).then(() => `data-${fetcher.mock.calls.length}`));
      const r = resource(fetcher, {
        refetchOnWindowFocus: true,
        refetchOnKeyChange: true,
      });

      effect(() => { r.status(); });
      await delay(20);

      expect(fetcher).toHaveBeenCalledTimes(1);

      // Tab return fires both events in the same tick - dedup absorbs the duplicate
      setVisibility("visible");
      window.dispatchEvent(new Event("focus"));

      await delay(20);

      expect(fetcher).toHaveBeenCalledTimes(2);

      r.dispose();
    });

    test("does not refetch when disabled", async () => {
      const fetcher = mock(() => delay(5).then(() => `data-${fetcher.mock.calls.length}`));
      const r = resource(fetcher, {
        refetchOnWindowFocus: false,
        refetchOnKeyChange: true,
      });

      effect(() => { r.status(); });
      await delay(20);

      expect(fetcher).toHaveBeenCalledTimes(1);

      setVisibility("hidden");
      setVisibility("visible");

      await delay(20);

      expect(fetcher).toHaveBeenCalledTimes(1);

      r.dispose();
    });

    test("stops refetching on dispose", async () => {
      const fetcher = mock(() => delay(5).then(() => `data-${fetcher.mock.calls.length}`));
      const r = resource(fetcher, {
        refetchOnWindowFocus: true,
        refetchOnKeyChange: true,
      });

      effect(() => { r.status(); });
      await delay(20);

      expect(fetcher).toHaveBeenCalledTimes(1);

      r.dispose();

      setVisibility("hidden");
      setVisibility("visible");

      await delay(20);

      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    test("does not refetch on focus after dispose", async () => {
      const fetcher = mock(() => delay(5).then(() => `data-${fetcher.mock.calls.length}`));
      const r = resource(fetcher, {
        refetchOnWindowFocus: true,
        refetchOnKeyChange: true,
      });

      effect(() => { r.status(); });
      await delay(20);

      expect(fetcher).toHaveBeenCalledTimes(1);

      r.dispose();

      window.dispatchEvent(new Event("focus"));

      await delay(20);

      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    test("does not refetch when hidden (only on visible)", async () => {
      const fetcher = mock(() => delay(5).then(() => `data-${fetcher.mock.calls.length}`));
      const r = resource(fetcher, {
        refetchOnWindowFocus: true,
        refetchOnKeyChange: true,
      });

      effect(() => { r.status(); });
      await delay(20);

      expect(fetcher).toHaveBeenCalledTimes(1);

      // Just hidden - should not refetch
      setVisibility("hidden");
      await delay(20);

      expect(fetcher).toHaveBeenCalledTimes(1);

      r.dispose();
    });

    test("refetchOnWindowFocus triggers even without auto-fetch enabled", async () => {
      const fetcher = mock(() => delay(5).then(() => `data-${fetcher.mock.calls.length}`));
      const r = resource(fetcher, {
        refetchOnWindowFocus: true,
      });

      effect(() => { r.status(); });
      await delay(20);

      // No auto, so no fetch yet
      expect(fetcher).toHaveBeenCalledTimes(0);

      // Manual trigger
      r.fetch({ force: true });
      await delay(20);

      expect(fetcher).toHaveBeenCalledTimes(1);

      setVisibility("hidden");
      setVisibility("visible");

      await delay(20);

      expect(fetcher).toHaveBeenCalledTimes(2);

      r.dispose();
    });

    test("respects enabled: false", async () => {
      const fetcher = mock(() => delay(5).then(() => `data-${fetcher.mock.calls.length}`));
      const r = resource(fetcher, {
        refetchOnWindowFocus: true,
        refetchOnKeyChange: true,
        enabled: false,
      });

      effect(() => { r.status(); });
      await delay(20);

      expect(fetcher).toHaveBeenCalledTimes(0);

      setVisibility("hidden");
      setVisibility("visible");

      await delay(20);

      expect(fetcher).toHaveBeenCalledTimes(0);

      r.dispose();
    });
  });
});
