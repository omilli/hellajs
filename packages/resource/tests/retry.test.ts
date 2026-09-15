import { describe, test, expect, beforeEach, mock } from "bun:test";
import { delay, resetTestState } from "@utils/test-helpers.js";
import { resource } from "@hellajs/resource/bundle";

describe("resource", () => {
  describe("retry", () => {
    beforeEach(() => { resetTestState(); });

    test("retries specified count", async () => {
      const fetcher = mock(() => {
        if (fetcher.mock.calls.length < 3) return Promise.reject(new Error("x"));
        return delay("ok");
      });
      const r = resource(fetcher, { retry: 3, retryDelay: 10 });
      r.fetch({ force: true });
      for (let __i = 0; __i < 100; __i++) { if (r.status() === "success") break; await delay(10); }
      expect(fetcher).toHaveBeenCalledTimes(3);
      expect(r.data()).toBe("ok");
    });

    test("retry: true retries exactly once", async () => {
      const fetcher = mock(() => Promise.reject(new Error("x")));
      const r = resource(fetcher, { retry: true, retryDelay: 10 });
      r.fetch({ force: true });
      for (let __i = 0; __i < 50; __i++) { if ((fetcher.mock.calls.length >= 2)) break; await delay(10); };
      expect(fetcher).toHaveBeenCalledTimes(2);
    });

    test("retry: false never retries", async () => {
      const fetcher = mock(() => Promise.reject(new Error("x")));
      const r = resource(fetcher, { retry: false });
      r.fetch({ force: true });
      await delay(20);
      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    test("conditional retry based on error", async () => {
      const fetcher = mock(() => Promise.reject(new Error("HTTP 404: x")));
      const r = resource(fetcher, { retry: (_, e) => e.category !== "not_found", retryDelay: 10 });
      r.fetch({ force: true });
      await delay(30);
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(r.error()?.category).toBe("not_found");
    });

    test("conditional retry for server errors", async () => {
      const fetcher = mock(() => Promise.reject(new Error("HTTP 500: x")));
      const r = resource(fetcher, { retry: (c, e) => e.category === "server" && c < 3, retryDelay: 10 });
      r.fetch({ force: true });
      for (let __i = 0; __i < 50; __i++) { if ((fetcher.mock.calls.length >= 3)) break; await delay(10); };
      expect(fetcher).toHaveBeenCalledTimes(3);
    });

    test("uses fixed retry delay", async () => {
      const ts: number[] = [];
      const fetcher = mock(() => {
        ts.push(Date.now());
        return fetcher.mock.calls.length < 3 ? Promise.reject(new Error("x")) : Promise.resolve("ok");
      });
      const r = resource(fetcher, { retry: 2, retryDelay: 50 });
      r.fetch({ force: true });
      for (let __i = 0; __i < 50; __i++) { if ((fetcher.mock.calls.length >= 3)) break; await delay(10); };
      expect(fetcher).toHaveBeenCalledTimes(3);
      expect(ts[1]! - ts[0]!).toBeGreaterThanOrEqual(40);
      expect(ts[2]! - ts[1]!).toBeGreaterThanOrEqual(40);
    });

    test("uses exponential retry delay", async () => {
      const ts2: number[] = [];
      const fetcher2 = mock(() => {
        ts2.push(Date.now());
        return Promise.reject(new Error("x"));
      });
      const r2 = resource(fetcher2, { retry: 2, retryDelay: a => a * 30 });
      r2.fetch({ force: true });
      for (let __i = 0; __i < 50; __i++) { if ((fetcher2.mock.calls.length >= 3)) break; await delay(10); };
      expect(fetcher2).toHaveBeenCalledTimes(3);
      expect(ts2[1]! - ts2[0]!).toBeGreaterThanOrEqual(25);
      expect(ts2[2]! - ts2[1]!).toBeGreaterThanOrEqual(55);
    });

    test("abort during delay", async () => {
      const fetcher = mock(() => Promise.reject(new Error("x")));
      const r = resource(fetcher, { retry: 10, retryDelay: 1000 });
      r.fetch({ force: true });
      await delay(10);
      r.abort();
      await delay(20);
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(r.status()).toBe("idle");
    });

    test("no retry on success", async () => {
      const fetcher = mock(() => delay("ok"));
      const r = resource(fetcher, { retry: 3, retryDelay: 10 });
      r.fetch({ force: true });
      for (let __i = 0; __i < 50; __i++) { if ((r.status() === "success")) break; await delay(10); }
      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    test("retryDelay receives error", async () => {
      const captured: { err: { category?: string; statusCode?: number } | null } = { err: null };
      const fetcher = mock(() => Promise.reject(new Error("HTTP 503: x")));
      const r = resource(fetcher, { retry: 1, retryDelay: (_, e) => { captured.err = e; return 10; } });
      r.fetch({ force: true });
      for (let __i = 0; __i < 50; __i++) { if ((fetcher.mock.calls.length >= 2)) break; await delay(10); };
      expect(captured.err?.category).toBe("server");
      expect(captured.err?.statusCode).toBe(503);
    });

    test("retry count resets between requests", async () => {
      const fetcher = mock(() =>
        fetcher.mock.calls.length === 1 ? Promise.reject(new Error("x")) : delay("ok")
      );
      const r = resource(fetcher, { retry: 3, retryDelay: 10 });
      r.fetch({ force: true });
      for (let __i = 0; __i < 50; __i++) { if ((!r.isFetching())) break; await delay(10); }
      expect(fetcher).toHaveBeenCalledTimes(2);

      fetcher.mockClear();
      r.fetch({ force: true });
      for (let __i = 0; __i < 50; __i++) { if ((!r.isFetching())) break; await delay(10); }
      expect(fetcher).toHaveBeenCalledTimes(2);
    });

    test("retries before caching the result", async () => {
      const fetcher = mock(() => {
        if (fetcher.mock.calls.length < 2) return Promise.reject(new Error("x"));
        return delay("ok");
      });
      const r = resource(fetcher, { retry: 3, retryDelay: 10, cacheTime: 1000, key: () => "k" });
      r.fetch({ force: true });
      for (let __i = 0; __i < 50; __i++) { if ((r.status() === "success")) break; await delay(10); }
      expect(fetcher).toHaveBeenCalledTimes(2);
      r.fetch();
      await delay(20);
      expect(fetcher).toHaveBeenCalledTimes(2);
    });

    test("a completed retried fetch leaves no residual abort listeners", async () => {
      const originalAdd = AbortSignal.prototype.addEventListener;
      const originalRemove = AbortSignal.prototype.removeEventListener;
      const addSpy = mock(function (this: AbortSignal, ...args: Parameters<AbortSignal["addEventListener"]>) {
        return originalAdd.apply(this, args);
      });
      const removeSpy = mock(function (this: AbortSignal, ...args: Parameters<AbortSignal["removeEventListener"]>) {
        return originalRemove.apply(this, args);
      });
      AbortSignal.prototype.addEventListener = addSpy as unknown as typeof originalAdd;
      AbortSignal.prototype.removeEventListener = removeSpy as unknown as typeof originalRemove;
      try {
        const fetcher = mock(() => {
          if (fetcher.mock.calls.length < 3) return Promise.reject(new Error("x"));
          return delay("ok");
        });
        const r = resource(fetcher, { retry: 2, retryDelay: 10 });
        r.fetch({ force: true });
        for (let __i = 0; __i < 50; __i++) { if (r.status() === "success") break; await delay(10); }
        expect(r.status()).toBe("success");
        expect(fetcher).toHaveBeenCalledTimes(3);
        expect(addSpy.mock.calls.length).toBeGreaterThan(0);
        expect(addSpy.mock.calls.length).toBe(removeSpy.mock.calls.length);
      } finally {
        AbortSignal.prototype.addEventListener = originalAdd;
        AbortSignal.prototype.removeEventListener = originalRemove;
      }
    });

    test("respects enabled: false", async () => {
      const fetcher = mock(() => Promise.reject(new Error("x")));
      const r = resource(fetcher, { retry: 3, enabled: false });
      r.fetch({ force: true });
      await delay(20);
      expect(fetcher).toHaveBeenCalledTimes(0);
    });
  });
});
