import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { delay } from "../../../utils/test-helpers.js";
import { effect } from "@hellajs/core";

import { resource, resourceCache } from "@hellajs/resource/bundle";

describe("resource", () => {
  describe("focus", () => {
    let originalVisibility: string;

    beforeEach(() => {
      resourceCache.map.clear();
      originalVisibility = document.visibilityState;
    });

    afterEach(() => {
      resourceCache.map.clear();
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
      let count = 0;
      const r = resource(() => delay(5).then(() => `data-${++count}`), {
        refetchOnWindowFocus: true,
        refetchOnKeyChange: true,
      });

      effect(() => { r.status(); });
      await delay(20);

      expect(count).toBe(1);

      // Simulate tab hidden then visible
      setVisibility("hidden");
      setVisibility("visible");

      await delay(20);

      expect(count).toBe(2);

      r.dispose();
    });

    test("does not refetch when disabled", async () => {
      let count = 0;
      const r = resource(() => delay(5).then(() => `data-${++count}`), {
        refetchOnWindowFocus: false,
        refetchOnKeyChange: true,
      });

      effect(() => { r.status(); });
      await delay(20);

      expect(count).toBe(1);

      setVisibility("hidden");
      setVisibility("visible");

      await delay(20);

      expect(count).toBe(1);

      r.dispose();
    });

    test("stops refetching on dispose", async () => {
      let count = 0;
      const r = resource(() => delay(5).then(() => `data-${++count}`), {
        refetchOnWindowFocus: true,
        refetchOnKeyChange: true,
      });

      effect(() => { r.status(); });
      await delay(20);

      expect(count).toBe(1);

      r.dispose();

      setVisibility("hidden");
      setVisibility("visible");

      await delay(20);

      expect(count).toBe(1);
    });

    test("does not refetch when hidden (only on visible)", async () => {
      let count = 0;
      const r = resource(() => delay(5).then(() => `data-${++count}`), {
        refetchOnWindowFocus: true,
        refetchOnKeyChange: true,
      });

      effect(() => { r.status(); });
      await delay(20);

      expect(count).toBe(1);

      // Just hidden - should not refetch
      setVisibility("hidden");
      await delay(20);

      expect(count).toBe(1);

      r.dispose();
    });

    test("works without auto mode (requires manual trigger)", async () => {
      let count = 0;
      const r = resource(() => delay(5).then(() => `data-${++count}`), {
        refetchOnWindowFocus: true,
      });

      effect(() => { r.status(); });
      await delay(20);

      // No auto, so no fetch yet
      expect(count).toBe(0);

      // Manual trigger
      r.fetch({ force: true });
      await delay(20);

      expect(count).toBe(1);

      setVisibility("hidden");
      setVisibility("visible");

      await delay(20);

      expect(count).toBe(2);

      r.dispose();
    });

    test("respects enabled: false", async () => {
      let count = 0;
      const r = resource(() => delay(5).then(() => `data-${++count}`), {
        refetchOnWindowFocus: true,
        refetchOnKeyChange: true,
        enabled: false,
      });

      effect(() => { r.status(); });
      await delay(20);

      expect(count).toBe(0);

      setVisibility("hidden");
      setVisibility("visible");

      await delay(20);

      expect(count).toBe(0);

      r.dispose();
    });
  });
});
