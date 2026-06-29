import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { delay } from "@utils/test-helpers.js";
import { effect } from "@hellajs/core";

import { resource, resourceCache } from "@hellajs/resource/bundle";

let originalVisibility: string;

describe("resource", () => {
  describe("polling", () => {
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

    test("polls at interval with refetchOnKeyChange", async () => {
      let count = 0;
      const r = resource(() => delay(5).then(() => `data-${++count}`), {
        refetchInterval: 30,
        refetchOnKeyChange: true,
      });

      effect(() => { r.status(); });
      await delay(100);

      expect(count).toBeGreaterThanOrEqual(2);
      r.dispose();
    });

    test("requires refetchOnKeyChange to poll", async () => {
      let count = 0;
      const r = resource(() => delay(5).then(() => `data-${++count}`), {
        refetchInterval: 30,
      });

      effect(() => { r.status(); });
      await delay(80);

      expect(count).toBe(0);
      r.dispose();
    });

    test.each(["abort", "reset"] as const)("stops polling on %s", async (method) => {
      let count = 0;
      const r = resource(() => delay(5).then(() => `data-${++count}`), {
        refetchInterval: 20,
        refetchOnKeyChange: true,
      });

      effect(() => { r.status(); });
      await delay(50);
      r[method]();
      const countAfter = count;

      await delay(50);
      expect(count).toBe(countAfter);
      r.dispose();
    });

    test("dynamic interval based on data", async () => {
      let count = 0;
      const r = resource(
        () => delay(5).then(() => ({ status: count++ > 0 ? "healthy" : "unhealthy" })),
        {
          refetchInterval: (data) => (!data ? 20 : data.status === "unhealthy" ? 20 : 100),
          refetchOnKeyChange: true,
        }
      );

      effect(() => { r.status(); });
      await delay(60);

      expect(count).toBeGreaterThanOrEqual(2);
      r.dispose();
    });

    test.each([false, 0])("refetchInterval %p disables polling", async (value) => {
      let count = 0;
      const r = resource(() => delay(5).then(() => `data-${++count}`), {
        refetchInterval: value as false | 0,
        refetchOnKeyChange: true,
      });

      effect(() => { r.status(); });
      await delay(80);

      expect(count).toBe(1);
      r.dispose();
    });

    test("respects enabled: false", async () => {
      let count = 0;
      const r = resource(() => delay(5).then(() => `data-${++count}`), {
        refetchInterval: 20,
        refetchOnKeyChange: true,
        enabled: false,
      });

      effect(() => { r.status(); });
      await delay(80);

      expect(count).toBe(0);
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
      let count = 0;
      const r = resource(() => delay(5).then(() => `data-${++count}`), {
        refetchInterval: 20,
        refetchOnKeyChange: true,
      });

      effect(() => { r.status(); });
      await delay(50);
      expect(count).toBeGreaterThanOrEqual(1);

      setHidden();
      const countWhenHidden = count;
      await delay(60);
      expect(count).toBe(countWhenHidden);

      setVisible();
      await delay(50);
      expect(count).toBeGreaterThan(countWhenHidden);

      r.dispose();
    });

    test("continues polling in background when enabled", async () => {
      let count = 0;
      const r = resource(() => delay(5).then(() => `data-${++count}`), {
        refetchInterval: 20,
        refetchIntervalInBackground: true,
        refetchOnKeyChange: true,
      });

      effect(() => { r.status(); });
      await delay(50);

      setHidden();
      const countWhenHidden = count;
      await delay(70);
      expect(count).toBeGreaterThan(countWhenHidden);

      r.dispose();
    });
  });
});