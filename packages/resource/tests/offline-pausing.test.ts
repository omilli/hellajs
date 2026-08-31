import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import { delay, resetTestState } from "@utils/test-helpers.js";
import { resource } from "@hellajs/resource/bundle";

describe("resource", () => {
  describe("pauseWhenOffline", () => {
    beforeEach(() => {
      resetTestState();
    });

    // onlineStatus is module state resetTestState() does not cover — always leave the world online
    afterEach(() => {
      window.dispatchEvent(new Event("online"));
    });

    test("defers fetch while offline without calling the fetcher", async () => {
      window.dispatchEvent(new Event("offline"));
      const fetcher = mock(() => delay(`data-${fetcher.mock.calls.length}`));
      const r = resource(fetcher, { pauseWhenOffline: true });

      await r.fetch();

      expect(fetcher).not.toHaveBeenCalled();
      expect(r.isPaused()).toBe(true);
      expect(r.error()).toBeUndefined();
      expect(r.status()).toBe("idle");

      r.dispose();
    });

    test("runs the deferred fetch when back online", async () => {
      window.dispatchEvent(new Event("offline"));
      const fetcher = mock(() => delay(`data-${fetcher.mock.calls.length}`));
      const r = resource(fetcher, { pauseWhenOffline: true });

      await r.fetch();
      expect(r.isPaused()).toBe(true);

      window.dispatchEvent(new Event("online"));
      await delay(20);

      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(r.data()).toBe("data-1");
      expect(r.isPaused()).toBe(false);

      r.dispose();
    });

    test("resumes a deferred force fetch as a force fetch", async () => {
      window.dispatchEvent(new Event("online"));
      const fetcher = mock(() => delay(`data-${fetcher.mock.calls.length}`));
      const r = resource(fetcher, { pauseWhenOffline: true, cacheTime: 1000 });

      // Prime a fresh cache entry — a non-force resume would hit it and skip the fetcher
      await r.fetch();
      expect(fetcher).toHaveBeenCalledTimes(1);

      window.dispatchEvent(new Event("offline"));
      await r.fetch({ force: true });
      expect(r.isPaused()).toBe(true);

      window.dispatchEvent(new Event("online"));
      await delay(20);

      expect(fetcher).toHaveBeenCalledTimes(2);
      expect(r.data()).toBe("data-2");
      expect(r.isPaused()).toBe(false);

      r.dispose();
    });

    test("attempts the fetcher and errors while offline without the option", async () => {
      window.dispatchEvent(new Event("offline"));
      const fetcher = mock(() => Promise.reject(new Error("network down")));
      const r = resource(fetcher);

      await r.fetch();
      await delay(20);

      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(r.error()?.message).toBe("network down");
      expect(r.status()).toBe("error");

      r.dispose();
    });

    test("does not resurrect a disposed resource on reconnect", async () => {
      window.dispatchEvent(new Event("offline"));
      const fetcher = mock(() => delay(`data-${fetcher.mock.calls.length}`));
      const r = resource(fetcher, { pauseWhenOffline: true });

      await r.fetch();
      expect(r.isPaused()).toBe(true);

      r.dispose();
      window.dispatchEvent(new Event("online"));
      await delay(20);

      expect(fetcher).not.toHaveBeenCalled();
      expect(r.data()).toBeUndefined();
    });

    test("defers polling ticks while offline and resumes after reconnect", async () => {
      window.dispatchEvent(new Event("offline"));
      const fetcher = mock(() => delay(`data-${fetcher.mock.calls.length}`));
      const r = resource(fetcher, { pauseWhenOffline: true, refetchInterval: 20 });

      // Ticks fire while offline but defer — no fetcher call
      await delay(60);
      expect(fetcher).not.toHaveBeenCalled();
      expect(r.isPaused()).toBe(true);

      window.dispatchEvent(new Event("online"));
      await delay(70);

      // The stashed run executes and later ticks fetch normally
      expect(fetcher.mock.calls.length).toBeGreaterThanOrEqual(2);
      expect(r.isPaused()).toBe(false);

      r.dispose();
    });
  });
});
