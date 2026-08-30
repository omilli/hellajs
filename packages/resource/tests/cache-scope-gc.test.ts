import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import { delay, resetTestState } from "@utils/test-helpers.js";
import { resource, resourceCache } from "@hellajs/resource/bundle";
import type { Fetcher } from "@hellajs/resource";

describe("cache scope garbage collection", () => {
  let mockTime = 0;
  let originalNow: typeof Date.now;

  // Fetches from an unrelated fetcher scope so its cache write runs the throttled
  // cleanup pass across every scope in cacheMap.
  const triggerCleanup = async () => {
    const other = resource(async (key: string) => `other-${key}`, { key: "other", cacheTime: 60000 });
    other.fetch();
    await delay(20);
  };

  beforeEach(() => {
    resetTestState();
    mockTime = 1000;
    originalNow = Date.now;
    Date.now = () => mockTime;
  });

  afterEach(() => {
    Date.now = originalNow;
  });

  test("releases the fetcher once its expired entry is cleaned up", async () => {
    let fetcherRef: WeakRef<Fetcher<string, string>>;
    // Block scope: fetcher and resource die at block exit — no explicit nulling
    // (post-settle access to the resource pins its graph in this runtime).
    {
      const fetcher: Fetcher<string, string> = async (key: string) => `data-${key}`;
      fetcherRef = new WeakRef(fetcher);
      const r = resource(fetcher, { key: "k", cacheTime: 1000 });

      r.fetch();
      await delay(20);
      expect(resourceCache.map.size).toBe(1);

      mockTime += 61000;
      await triggerCleanup();
      expect(resourceCache.map.size).toBe(1);
    }

    // Flush a macrotask turn: JSC keeps objects reachable from scheduled-but-
    // unprocessed async machinery, so a turn boundary before Bun.gc is required
    // for a deterministic sweep. Pre-fix, cacheMap still holds the fetcher scope
    // and the deref finds it alive.
    await delay(0);
    Bun.gc(true);
    Bun.gc(true);
    Bun.gc(true);
    expect(fetcherRef.deref()).toBeUndefined();
  });

  test("refetches and re-caches after the emptied scope is reaped", async () => {
    const fetcher = mock(async (key: string) => `data-${key}`);
    const r = resource(fetcher, { key: "k", cacheTime: 60000 });

    r.fetch();
    await delay(20);
    expect(fetcher).toHaveBeenCalledTimes(1);

    mockTime += 61000;
    await triggerCleanup();

    // Cache miss after the reap → network again through a recreated scope.
    r.fetch();
    await delay(20);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(r.data()).toBe("data-k");

    // TTL-valid hit → the recreated scope serves reads without network.
    r.fetch();
    await delay(20);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  test("keeps a scope holding a TTL-valid entry across the cleanup pass", async () => {
    const fetcher = mock(async (key: string) => `data-${key}`);
    const r = resource(fetcher, { key: "k", cacheTime: 600000 });

    r.fetch();
    await delay(20);

    mockTime += 61000;
    await triggerCleanup();

    r.fetch();
    await delay(20);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
