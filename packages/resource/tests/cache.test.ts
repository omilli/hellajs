import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import {delay} from "../../../utils/test-helpers.js";
import { resource, resourceCache } from "@hellajs/resource/bundle";
import { mockUser } from "./helpers";

describe("resource", () => {
  describe("cache", () => {
    beforeEach(() => {
      resourceCache.setConfig({ maxSize: 1000, enableLRU: true });
    });

    afterEach(() => {
      resourceCache.map.clear();
    });

    test("caches data", async () => {
      const fetcher = mock(() => delay(mockUser, 5));
      const r = resource(fetcher, { cacheTime: 100 });
      r.fetch({ force: true });
      await delay(20);
      expect(r.data()).toEqual(mockUser);
      expect(fetcher).toHaveBeenCalledTimes(1);
      r.fetch();
      expect(r.data()).toEqual(mockUser);
      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    test("skips cache when disabled", async () => {
      const fetcher = mock(() => delay(`Call ${fetcher.mock.calls.length}`, 5));
      const r = resource(fetcher, { cacheTime: 0 });
      r.fetch({ force: true });
      await delay(20);
      expect(r.data()).toBe("Call 1");
      r.fetch({ force: true });
      await delay(20);
      expect(r.data()).toBe("Call 2");
      expect(fetcher).toHaveBeenCalledTimes(2);
    });

    test("returns cached data immediately", async () => {
      const fetcher = mock((k: string) => delay({ key: k, data: `Data for ${k}` }, 5));
      const r = resource(fetcher, { cacheTime: 1000, key: () => "user-1" });

      r.fetch({ force: true });
      await delay(20);
      expect(r.data()?.data).toBe("Data for user-1");
      expect(fetcher).toHaveBeenCalledTimes(1);

      r.fetch();
      expect(r.data()?.data).toBe("Data for user-1");
      await delay(20);
      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    test("cleans up expired cache entries", async () => {
      resourceCache.map.clear();

      const fetcher = mock(() => delay(`Call ${fetcher.mock.calls.length}`, 5));
      const r = resource(fetcher, { cacheTime: 30 });

      r.fetch({ force: true });
      await delay(20);
      expect(r.data()).toBe("Call 1");
      expect(fetcher).toHaveBeenCalledTimes(1);

      await delay(50);

      r.fetch({ force: true });
      await delay(20);
      expect(r.data()).toBe("Call 2");
      expect(fetcher).toHaveBeenCalledTimes(2);
    });

    test("respects cache size limits with LRU eviction", async () => {
      resourceCache.setConfig({ maxSize: 2, enableLRU: true });

      const fetcher = mock((key: number) => delay(`data-${key}`, 5));

      const r1 = resource(fetcher, { key: () => 1, cacheTime: 60000 });
      const r2 = resource(fetcher, { key: () => 2, cacheTime: 60000 });
      const r3 = resource(fetcher, { key: () => 3, cacheTime: 60000 });

      r1.fetch({ force: true });
      await delay(20);
      r2.fetch({ force: true });
      await delay(20);

      expect(r1.data()).toBe("data-1");
      expect(r2.data()).toBe("data-2");
      expect(fetcher).toHaveBeenCalledTimes(2);

      r3.fetch({ force: true });
      await delay(20);
      expect(r3.data()).toBe("data-3");
      expect(fetcher).toHaveBeenCalledTimes(3);

      const r1Again = resource(fetcher, { key: () => 1, cacheTime: 60000 });
      r1Again.fetch();
      await delay(20);

      expect(fetcher).toHaveBeenCalledTimes(4);
    });

    test("does not evict when cache is under limit", async () => {
      resourceCache.setConfig({ maxSize: 10, enableLRU: true });

      const fetcher = mock((key: number) => delay(`data-${key}`, 5));

      const resources = [];
      for (let i = 0; i < 5; i++) {
        const r = resource(fetcher, { key: () => i, cacheTime: 60000 });
        resources.push(r);
        r.fetch({ force: true });
        await delay(20);
      }

      expect(fetcher).toHaveBeenCalledTimes(5);

      for (let i = 0; i < 5; i++) {
        const r = resource(fetcher, { key: () => i, cacheTime: 60000 });
        r.fetch();
        await delay(20);
      }

      expect(fetcher).toHaveBeenCalledTimes(5);
    });

    test("disables LRU eviction when configured", async () => {
      resourceCache.setConfig({ maxSize: 2, enableLRU: false });

      const fetcher = mock((key: number) => delay(`data-${key}`, 5));

      const r1 = resource(fetcher, { key: () => 1, cacheTime: 60000 });
      const r2 = resource(fetcher, { key: () => 2, cacheTime: 60000 });
      const r3 = resource(fetcher, { key: () => 3, cacheTime: 60000 });

      r1.fetch({ force: true });
      await delay(20);
      r2.fetch({ force: true });
      await delay(20);
      r3.fetch({ force: true });
      await delay(20);

      expect(fetcher).toHaveBeenCalledTimes(3);

      const r1Again = resource(fetcher, { key: () => 1, cacheTime: 60000 });
      r1Again.fetch();
      await delay(20);

      expect(fetcher).toHaveBeenCalledTimes(3);
    });

    test("updates last access time on cache hits", async () => {
      resourceCache.setConfig({ maxSize: 2, enableLRU: true });

      const fetcher = mock((key: number) => delay(`data-${key}`, 5));

      const r1 = resource(fetcher, { key: () => 1, cacheTime: 60000 });
      const r2 = resource(fetcher, { key: () => 2, cacheTime: 60000 });

      r1.fetch({ force: true });
      await delay(20);
      r2.fetch({ force: true });
      await delay(20);

      r1.fetch();
      await delay(20);

      const r3 = resource(fetcher, { key: () => 3, cacheTime: 60000 });
      r3.fetch({ force: true });
      await delay(20);

      const r1Again = resource(fetcher, { key: () => 1, cacheTime: 60000 });
      r1Again.fetch();
      await delay(20);

      expect(fetcher).toHaveBeenCalledTimes(3);
      expect(r1Again.data()).toBe("data-1");

      const r2Again = resource(fetcher, { key: () => 2, cacheTime: 60000 });
      r2Again.fetch();
      await delay(20);

      expect(fetcher).toHaveBeenCalledTimes(4);
    });
  });
});
