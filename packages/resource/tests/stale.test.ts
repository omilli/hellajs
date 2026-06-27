import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import {delay} from "../../../utils/test-helpers.js";
import { resource, resourceCache } from "@hellajs/resource/bundle";

describe("resource", () => {
  describe("stale", () => {
    beforeEach(() => {
      resourceCache.map.clear();
    });

    afterEach(() => {
      resourceCache.map.clear();
    });

    test("returns cached data without refetch within staleTime", async () => {
      const fetcher = mock(() => delay(`data-${fetcher.mock.calls.length}`, 10));
      const r = resource(fetcher, { staleTime: 500, cacheTime: 1000, key: () => "test-key" });

      r.fetch({ force: true });
      await delay(20);
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(r.data()).toBe("data-1");

      // Within staleTime - no refetch
      r.fetch();
      await delay(20);
      expect(fetcher).toHaveBeenCalledTimes(1); // No second fetch
      expect(r.data()).toBe("data-1");
    });

    test("triggers background refetch when data is stale", async () => {
      const fetcher = mock(() => delay(`data-${fetcher.mock.calls.length}`, 10));
      const r = resource(fetcher, { staleTime: 1, cacheTime: 1000, key: () => "test-key" });

      r.fetch({ force: true });
      await delay(20);

      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(r.data()).toBe("data-1");
      expect(r.isFetching()).toBe(false);

      // Wait for data to become stale (> 1ms)
      await delay(50);

      // get() should return stale data immediately and trigger background fetch
      r.fetch();

      // Immediately after get(): has stale data, isFetching should be true
      expect(r.data()).toBe("data-1"); // Stale data returned immediately
      expect(r.isFetching()).toBe(true); // Background fetch in progress
      expect(r.isLoading()).toBe(false); // Not loading since we have data

      // Wait for background fetch to complete
      await delay(30);

      expect(fetcher).toHaveBeenCalledTimes(2); // Background fetch happened
      expect(r.data()).toBe("data-2"); // Updated from background
      expect(r.isFetching()).toBe(false);
    });

    test("isFetching is true during background refetch", async () => {
      const r = resource(
        () => delay("data", 10),
        { staleTime: 1, cacheTime: 1000, key: () => "test-key" }
      );

      r.fetch({ force: true });
      await delay(20);

      expect(r.data()).toBe("data");
      expect(r.isFetching()).toBe(false);

      // Wait for stale
      await delay(50);

      r.fetch();

      // Background fetch started
      expect(r.isFetching()).toBe(true);
      expect(r.isLoading()).toBe(false); // Has data, not initial load

      await delay(30);
      expect(r.isFetching()).toBe(false);
    });

    test("revalidateOnStale false prevents background fetch", async () => {
      const fetcher = mock(() => delay(`data-${fetcher.mock.calls.length}`, 10));
      const r = resource(fetcher, { staleTime: 1, cacheTime: 1000, revalidateOnStale: false, key: () => "test-key" });

      r.fetch({ force: true });
      await delay(20);

      // Wait for stale
      await delay(50);

      r.fetch();
      await delay(20);

      expect(fetcher).toHaveBeenCalledTimes(1); // No background fetch
      expect(r.isFetching()).toBe(false);
    });

    test("staleTime Infinity never refetches on get", async () => {
      const fetcher = mock(() => delay(`data-${fetcher.mock.calls.length}`, 10));
      const r = resource(fetcher, { staleTime: Infinity, cacheTime: 1000, key: () => "test-key" });

      r.fetch({ force: true });
      await delay(20);

      await delay(100);

      r.fetch();
      await delay(20);

      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(r.isFetching()).toBe(false);
    });

    test("staleTime 0 always triggers background fetch on get", async () => {
      const fetcher = mock(() => delay(`data-${fetcher.mock.calls.length}`, 10));
      const r = resource(fetcher, { staleTime: 0, cacheTime: 1000, key: () => "test-key" });

      r.fetch({ force: true });
      await delay(20);

      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(r.data()).toBe("data-1");

      // Wait a bit to ensure time has passed (staleTime 0 means any time > 0 is stale)
      await delay(5);

      // staleTime 0 means always stale
      r.fetch();

      // Background fetch triggered immediately
      expect(r.isFetching()).toBe(true);
      expect(r.data()).toBe("data-1"); // Stale data returned

      await delay(30);

      expect(fetcher).toHaveBeenCalledTimes(2);
      expect(r.data()).toBe("data-2");
    });

    test("cache entry stores staleTime", async () => {
      const r = resource(
        () => delay("data"),
        { staleTime: 500, cacheTime: 1000, key: () => "test-key" }
      );

      r.fetch({ force: true });
      await delay(20);

      const entry = resourceCache.map.get("test-key");
      expect(entry?.staleTime).toBe(500);
    });

    test("uses Infinity as default staleTime when not specified", async () => {
      const r = resource(
        () => delay("data"),
        { cacheTime: 1000, key: () => "test-key" }
      );

      r.fetch({ force: true });
      await delay(20);

      const entry = resourceCache.map.get("test-key");
      expect(entry?.staleTime).toBe(Infinity);
    });

    test("staleTime 0 marks data as always stale in cache", async () => {
      const r = resource(
        () => delay("data"),
        { staleTime: 0, cacheTime: 1000, key: () => "test-key" }
      );

      r.fetch({ force: true });
      await delay(20);

      const entry = resourceCache.map.get("test-key");
      expect(entry?.staleTime).toBe(0);
    });
  });
});
