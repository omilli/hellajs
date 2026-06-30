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

    test("retry: true = 1 retry, false = 0", async () => {
      const fetcher1 = mock(() => Promise.reject(new Error("x")));
      const r1 = resource(fetcher1, { retry: true, retryDelay: 10 });
      r1.fetch({ force: true });
      for (let __i = 0; __i < 50; __i++) { if ((fetcher1.mock.calls.length >= 2)) break; await delay(10); };
      expect(fetcher1).toHaveBeenCalledTimes(2);

      const fetcher2 = mock(() => Promise.reject(new Error("x")));
      const r2 = resource(fetcher2, { retry: false });
      r2.fetch({ force: true });
      await delay(20);
      expect(fetcher2).toHaveBeenCalledTimes(1);
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
      let fetchCount = 0;
      const fetcher = mock(() => {
        ts.push(Date.now());
        fetchCount++;
        return fetcher.mock.calls.length < 3 ? Promise.reject(new Error("x")) : Promise.resolve("ok");
      });
      const r = resource(fetcher, { retry: 2, retryDelay: 50 });
      r.fetch({ force: true });
      for (let __i = 0; __i < 50; __i++) { if ((fetchCount >= 3)) break; await delay(10); };
      expect(fetcher).toHaveBeenCalledTimes(3);
      expect(ts[1]! - ts[0]!).toBeGreaterThanOrEqual(40);
      expect(ts[2]! - ts[1]!).toBeGreaterThanOrEqual(40);
    });

    test("uses exponential retry delay", async () => {
      const ts2: number[] = [];
      let fetchCount = 0;
      const fetcher2 = mock(() => {
        ts2.push(Date.now());
        fetchCount++;
        return Promise.reject(new Error("x"));
      });
      const r2 = resource(fetcher2, { retry: 2, retryDelay: a => a * 30 });
      r2.fetch({ force: true });
      for (let __i = 0; __i < 50; __i++) { if ((fetchCount >= 3)) break; await delay(10); };
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
      let n = 0;
      let fail = true;
      const fetcher = mock(() => {
        n++;
        return (n === 1 && fail) ? Promise.reject(new Error("x")) : delay("ok");
      });
      const r = resource(
        fetcher,
        { retry: 3, retryDelay: 10 }
      );
      r.fetch({ force: true });
      for (let __i = 0; __i < 50; __i++) { if ((!r.isFetching())) break; await delay(10); }
      expect(fetcher).toHaveBeenCalledTimes(2);
      expect(n).toBe(2);

      n = 0; fail = true;
      r.fetch({ force: true });
      for (let __i = 0; __i < 50; __i++) { if ((!r.isFetching())) break; await delay(10); }
      expect(fetcher).toHaveBeenCalledTimes(4);
      expect(n).toBe(2);
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

    test("respects enabled: false", async () => {
      const fetcher = mock(() => Promise.reject(new Error("x")));
      const r = resource(fetcher, { retry: 3, enabled: false });
      r.fetch({ force: true });
      await delay(20);
      expect(fetcher).toHaveBeenCalledTimes(0);
    });
  });
});
