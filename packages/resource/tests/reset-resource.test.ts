import { describe, test, expect, beforeEach, mock } from "bun:test";
import { delay, resetTestState } from "@utils/test-helpers.js";
import { resetResource, resourceCache, resource } from "@hellajs/resource/bundle";

describe("resetResource", () => {
  let mockTime = 0;
  let originalNow: typeof Date.now;

  beforeEach(() => {
    resetTestState();
  });

  test("clears the cache map", () => {
    resourceCache.set("key", "value", 10000);
    expect(resourceCache.get<string>("key")).toBe("value");

    resetResource();

    expect(resourceCache.get("key")).toBeUndefined();
  });

  test("clears online callbacks", () => {
    const cb = mock(() => {});
    resourceCache.onOnlineChange(cb);

    resetResource();

    window.dispatchEvent(new Event("online"));
    expect(cb).not.toHaveBeenCalled();
  });

  test("resets cleanup throttle — next setCacheData runs cleanup unconditionally", () => {
    mockTime = 1000;
    originalNow = Date.now;
    Date.now = () => mockTime;

    resourceCache.setConfig({ maxSize: 10, enableLRU: false });
    for (let i = 0; i < 5; i++) resourceCache.set(`key${i}`, `val${i}`, 100);

    mockTime += 200;

    resetResource();

    resourceCache.set("new", "val", 10000);
    expect(resourceCache.map.size).toBe(1);

    Date.now = originalNow;
  });

  test("invalidateAll is not a full reset — leaves online callbacks registered", () => {
    resourceCache.set("key", "value", 10000);
    const cb = mock(() => {});
    resourceCache.onOnlineChange(cb);

    resourceCache.invalidateAll();

    expect(resourceCache.get<string>("key")).toBeUndefined();

    window.dispatchEvent(new Event("online"));
    expect(cb).toHaveBeenCalledTimes(1);
  });

  test("full reset clears dedup — fresh fetch after reset is not deduped against prior in-flight", async () => {
    const fetcher = mock(async (key: string) => {
      await delay(20);
      return `data-${key}`;
    });

    const r1 = resource(fetcher, { key: () => "a", deduplicate: true });
    r1.fetch({ force: true });
    expect(r1.isLoading()).toBe(true);

    resetResource();

    const r2 = resource(fetcher, { key: () => "a", deduplicate: true });
    r2.fetch({ force: true });

    await delay(30);

    // Without reset, the fetcher would be called once (dedup).
    // After reset, dedup registration is cleared, so fetcher fires again.
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
