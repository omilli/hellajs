import { describe, test, expect, beforeEach } from "bun:test";
import {delay} from "../../../utils/test-helpers.js";
import { resource, resourceCache } from "@hellajs/resource/bundle";

describe("resource", () => {
  describe("retry", () => {
    beforeEach(() => resourceCache.map.clear());

    test("retries specified count", async () => {
      let n = 0;
      const r = resource(
        () => (++n < 3 ? Promise.reject(new Error("x")) : delay("ok")),
        { retry: 3, retryDelay: 10 }
      );
      r.fetch({ force: true });
      for (let __i = 0; __i < 100; __i++) { if (r.status() === "success") break; await delay(10); }
      expect(n).toBe(3);
      expect(r.data()).toBe("ok");
    });

    test("retry: true = 1 retry, false = 0", async () => {
      let n = 0;
      const r1 = resource(() => { ++n; return Promise.reject(new Error("x")); }, { retry: true, retryDelay: 10 });
      r1.fetch({ force: true });
      for (let __i = 0; __i < 50; __i++) { if ((n >= 2)) break; await delay(10); };
      expect(n).toBe(2);

      n = 0;
      const r2 = resource(() => { ++n; return Promise.reject(new Error("x")); }, { retry: false });
      r2.fetch({ force: true });
      await delay(20);
      expect(n).toBe(1);
    });

    test("conditional retry based on error", async () => {
      let n = 0;
      const r = resource(
        () => { ++n; return Promise.reject(new Error("HTTP 404: x")); },
        { retry: (_, e) => e.category !== "not_found", retryDelay: 10 }
      );
      r.fetch({ force: true });
      await delay(30);
      expect(n).toBe(1);
      expect(r.error()?.category).toBe("not_found");
    });

    test("conditional retry for server errors", async () => {
      let n = 0;
      const r = resource(
        () => { ++n; return Promise.reject(new Error("HTTP 500: x")); },
        { retry: (c, e) => e.category === "server" && c < 3, retryDelay: 10 }
      );
      r.fetch({ force: true });
      for (let __i = 0; __i < 50; __i++) { if ((n >= 3)) break; await delay(10); };
      expect(n).toBe(3);
    });

    test("uses fixed retry delay", async () => {
      const ts: number[] = [];
      let n = 0;
      const r = resource(
        () => {
          ts.push(Date.now());
          return ++n < 3 ? Promise.reject(new Error("x")) : Promise.resolve("ok");
        },
        { retry: 2, retryDelay: 50 }
      );
      r.fetch({ force: true });
      for (let __i = 0; __i < 50; __i++) { if ((n >= 3)) break; await delay(10); };
      expect(ts[1]! - ts[0]!).toBeGreaterThanOrEqual(40);
      expect(ts[2]! - ts[1]!).toBeGreaterThanOrEqual(40);
    });

    test("uses exponential retry delay", async () => {
      const ts2: number[] = [];
      let n2 = 0;
      const r2 = resource(
        () => {
          ts2.push(Date.now());
          ++n2;
          return Promise.reject(new Error("x"));
        },
        { retry: 2, retryDelay: a => a * 30 }
      );
      r2.fetch({ force: true });
      for (let __i = 0; __i < 50; __i++) { if ((n2 >= 3)) break; await delay(10); };
      expect(ts2[1]! - ts2[0]!).toBeGreaterThanOrEqual(25);
      expect(ts2[2]! - ts2[1]!).toBeGreaterThanOrEqual(55);
    });

    test("abort during delay", async () => {
      let n = 0;
      const r = resource(() => { ++n; return Promise.reject(new Error("x")); }, { retry: 10, retryDelay: 1000 });
      r.fetch({ force: true });
      await delay(10);
      r.abort();
      await delay(20);
      expect(n).toBe(1);
      expect(r.status()).toBe("idle");
    });

    test("no retry on success", async () => {
      let n = 0;
      const r = resource(() => { ++n; return delay("ok"); }, { retry: 3, retryDelay: 10 });
      r.fetch({ force: true });
      for (let __i = 0; __i < 50; __i++) { if ((r.status() === "success")) break; await delay(10); }
      expect(n).toBe(1);
    });

    test("retryDelay receives error", async () => {
      const captured: { err: { category?: string; statusCode?: number } | null } = { err: null };
      let n = 0;
      const r = resource(
        () => { ++n; return Promise.reject(new Error("HTTP 503: x")); },
        { retry: 1, retryDelay: (_, e) => { captured.err = e; return 10; } }
      );
      r.fetch({ force: true });
      for (let __i = 0; __i < 50; __i++) { if ((n >= 2)) break; await delay(10); };
      expect(captured.err?.category).toBe("server");
      expect(captured.err?.statusCode).toBe(503);
    });

    test("retry count resets between requests", async () => {
      let n = 0;
      let fail = true;
      const r = resource(
        () => (n++ === 0 && fail ? Promise.reject(new Error("x")) : delay("ok")),
        { retry: 3, retryDelay: 10 }
      );
      r.fetch({ force: true });
      for (let __i = 0; __i < 50; __i++) { if ((!r.isFetching())) break; await delay(10); }
      expect(n).toBe(2);

      n = 0; fail = true;
      r.fetch({ force: true });
      for (let __i = 0; __i < 50; __i++) { if ((!r.isFetching())) break; await delay(10); }
      expect(n).toBe(2);
    });

    test("works with cache", async () => {
      let n = 0;
      const r = resource(
        () => (++n < 2 ? Promise.reject(new Error("x")) : delay("ok")),
        { retry: 3, retryDelay: 10, cacheTime: 1000, key: () => "k" }
      );
      r.fetch({ force: true });
      for (let __i = 0; __i < 50; __i++) { if ((r.status() === "success")) break; await delay(10); }
      expect(n).toBe(2);
      r.fetch();
      await delay(20);
      expect(n).toBe(2);
    });

    test("respects enabled: false", async () => {
      let n = 0;
      const r = resource(() => { ++n; return Promise.reject(new Error("x")); }, { retry: 3, enabled: false });
      r.fetch({ force: true });
      await delay(20);
      expect(n).toBe(0);
    });
  });
});
