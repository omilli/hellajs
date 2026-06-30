import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { delay, resetTestState } from "@utils/test-helpers.js";
import { resource, resourceCache } from "@hellajs/resource/bundle";

describe("resourceCache", () => {
  let mockTime = 0;
  let originalNow: typeof Date.now;

  beforeEach(() => {
    resetTestState();
    resourceCache.setConfig({ maxSize: 1000, enableLRU: true });
    originalNow = Date.now;
  });

  afterEach(() => {
    Date.now = originalNow;
  });

  describe("update", () => {
    test("update with function updater", () => {
      resourceCache.set("key1", "initial", 60000);

      const success = resourceCache.update("key1", (old) => `${old}-updated`);
      expect(success).toBe(true);
      expect(resourceCache.get<string>("key1")).toBe("initial-updated");
    });

    test("update with direct value", () => {
      resourceCache.set("key1", "initial", 60000);

      const success = resourceCache.update("key1", "replaced");
      expect(success).toBe(true);
      expect(resourceCache.get<string>("key1")).toBe("replaced");
    });

    test("update returns false for non-existent key", () => {
      const success = resourceCache.update("nonexistent", "value");
      expect(success).toBe(false);
    });

    test("update returns false for expired entry", async () => {
      mockTime = 1000;
      Date.now = () => mockTime;

      resourceCache.set("key1", "data", 10);
      mockTime += 20;

      const success = resourceCache.update("key1", "updated");
      expect(success).toBe(false);
      expect(resourceCache.map.has("key1")).toBe(false);
    });

    test("updateMultiple processes array of updates", () => {
      resourceCache.set("key1", "data1", 60000);
      resourceCache.set("key2", "data2", 60000);

      resourceCache.updateMultiple([
        { key: "key1", updater: (old) => `${old}-updated` },
        { key: "key2", updater: "replaced" }
      ]);

      expect(resourceCache.get<string>("key1")).toBe("data1-updated");
      expect(resourceCache.get<string>("key2")).toBe("replaced");
    });

    test("setData with function updater updates cached data", async () => {
      const r = resource(() => delay("initial"), { cacheTime: 60000, key: () => "test-key" });

      r.fetch({ force: true });
      await delay(20);

      r.setData((old: string) => old ? `${old}-updated` : "updated");
      expect(resourceCache.get<string>("test-key")).toBe("initial-updated");
    });

    test("setData with direct value updates cached data", async () => {
      const r = resource(() => delay("initial"), { cacheTime: 60000, key: () => "test-key" });

      r.fetch({ force: true });
      await delay(20);

      r.setData("replaced");
      expect(resourceCache.get<string>("test-key")).toBe("replaced");
    });

    test("setData with function when cache miss and cacheTime > 0", () => {
      const r = resource(() => delay("initial"), { cacheTime: 60000, key: () => "test-key" });

      r.setData((old: string) => old ? `${old}-updated` : "new");
      expect(resourceCache.get<string>("test-key")).toBe("new");
    });

    test("setData ignores update when cacheTime is 0", () => {
      const r = resource(() => delay("initial"), { cacheTime: 0, key: () => "test-key" });

      r.setData("should-not-be-cached");
      expect(resourceCache.get<string>("test-key")).toBeUndefined();
    });

    test("setData with function updater re-creates expired cache entry", async () => {
      mockTime = 1000;
      Date.now = () => mockTime;

      const r = resource(
        () => delay("initial", 5),
        { cacheTime: 100, key: () => "expiring-key" }
      );

      r.fetch({ force: true });
      await delay(20);

      // Entry exists and is fresh
      expect(resourceCache.get<string>("expiring-key")).toBe("initial");

      // Advance past TTL so cache entry expires
      mockTime += 200;

      // setData calls getCacheData internally which deletes the expired entry
      // At this point rawData() still has "initial", so the updater receives "initial"
      r.setData((old: string) => `${old}-updated`);

      // The cache entry was re-created with the new value
      expect(resourceCache.get<string>("expiring-key")).toBe("initial-updated");
    });
  });
});
