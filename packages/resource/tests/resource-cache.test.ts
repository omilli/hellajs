import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import {delay} from "@utils/test-helpers.js";
import { resource, resourceCache } from "@hellajs/resource/bundle";

describe("resourceCache", () => {
  let mockTime = 0;
  let originalNow: typeof Date.now;

  beforeEach(() => {
    resourceCache.map.clear();
    resourceCache.setConfig({ maxSize: 1000, enableLRU: true });
    originalNow = Date.now;
  });

  afterEach(() => {
    resourceCache.map.clear();
    Date.now = originalNow;
  });

  test("setConfig merges configuration", () => {
    resourceCache.setConfig({ maxSize: 500 });
    expect(resourceCache.config.maxSize).toBe(500);
    expect(resourceCache.config.enableLRU).toBe(true);

    resourceCache.setConfig({ enableLRU: false });
    expect(resourceCache.config.maxSize).toBe(500);
    expect(resourceCache.config.enableLRU).toBe(false);
  });

  test("createKeyGenerator returns template function", () => {
    const generator = resourceCache.createKeyGenerator<{ id: number }>();
    const template = generator((params) => `user-${params.id}`);

    expect(template({ id: 1 })).toBe("user-1");
    expect(template({ id: 2 })).toBe("user-2");
  });

  describe("set/get", () => {
    test("set with cacheTime=0 does nothing", () => {
      resourceCache.set("key1", "data1", 0);
      expect(resourceCache.map.size).toBe(0);
    });

    test("get updates lastAccess for LRU", async () => {
      mockTime = 1000;
      Date.now = () => mockTime;

      resourceCache.set("key1", "data1", 60000);
      const entry = resourceCache.map.get("key1");
      const originalAccess = entry?.lastAccess;

      mockTime += 100;
      resourceCache.get("key1");
      const updatedEntry = resourceCache.map.get("key1");
      expect(updatedEntry?.lastAccess).toBeGreaterThan(originalAccess!);
    });

    test("get returns undefined and removes expired entry", () => {
      mockTime = 1000;
      Date.now = () => mockTime;

      resourceCache.set("expiring-key", "data", 10);
      mockTime += 20;

      const result = resourceCache.get<string>("expiring-key");
      expect(result).toBeUndefined();
      expect(resourceCache.map.has("expiring-key")).toBe(false);
    });
  });

  describe("LRU eviction", () => {
    test("cleanup throttles to avoid excessive processing", async () => {
      resourceCache.map.clear();
      mockTime = Date.now() + 100000;
      Date.now = () => mockTime;

      resourceCache.cleanup();

      resourceCache.set("key1", "data1", 10);
      mockTime += 5;
      resourceCache.cleanup();
      expect(resourceCache.map.size).toBe(1);

      mockTime += 30;
      resourceCache.cleanup();
      expect(resourceCache.map.size).toBe(1);

      mockTime += 60000;
      resourceCache.cleanup();
      expect(resourceCache.map.size).toBe(0);
    });

    test("evicts oldest entries when exceeding maxSize", () => {
      resourceCache.setConfig({ maxSize: 3, enableLRU: true });

      mockTime = 1000;
      Date.now = () => mockTime;

      resourceCache.set("key1", "data1", 60000);
      mockTime += 100;
      resourceCache.set("key2", "data2", 60000);
      mockTime += 100;
      resourceCache.set("key3", "data3", 60000);

      mockTime += 100;
      resourceCache.get("key1");

      mockTime += 100;
      resourceCache.set("key4", "data4", 60000);
      mockTime += 100;
      resourceCache.set("key5", "data5", 60000);

      expect(resourceCache.map.size).toBe(3);
      expect(resourceCache.get<string>("key1")).toBe("data1");
      expect(resourceCache.get("key2")).toBeUndefined();
      expect(resourceCache.get("key3")).toBeUndefined();
      expect(resourceCache.get<string>("key4")).toBe("data4");
      expect(resourceCache.get<string>("key5")).toBe("data5");
    });
  });

  describe("invalidation", () => {
    test("invalidate removes single key", () => {
      resourceCache.set("key1", "data1", 60000);
      resourceCache.set("key2", "data2", 60000);

      resourceCache.invalidate("key1");

      expect(resourceCache.get<string>("key1")).toBeUndefined();
      expect(resourceCache.get<string>("key2")).toBe("data2");
    });

    test("invalidateMultiple removes multiple keys", () => {
      resourceCache.set("key1", "data1", 60000);
      resourceCache.set("key2", "data2", 60000);
      resourceCache.set("key3", "data3", 60000);

      resourceCache.invalidateMultiple(["key1", "key3"]);

      expect(resourceCache.get("key1")).toBeUndefined();
      expect(resourceCache.get<string>("key2")).toBe("data2");
      expect(resourceCache.get("key3")).toBeUndefined();
    });

    test("invalidateResources calls invalidate on all resources", () => {
      const invalidate1 = mock(() => {});
      const invalidate2 = mock(() => {});

      resourceCache.invalidateResources([
        { invalidate: invalidate1 },
        { invalidate: invalidate2 }
      ]);

      expect(invalidate1).toHaveBeenCalled();
      expect(invalidate2).toHaveBeenCalled();
    });
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

  describe("flat view", () => {
    test("map.get skips expired scope and finds fresh entry in another scope", async () => {
      mockTime = 1000;
      Date.now = () => mockTime;

      const fetcherA = () => delay("stale", 5);
      const fetcherB = () => delay("fresh", 5);

      // First scope gets entry with short TTL
      const rA = resource(fetcherA, { key: () => "shared-key", cacheTime: 30 });
      rA.fetch({ force: true });
      await delay(20);

      // Second scope gets entry with long TTL
      const rB = resource(fetcherB, { key: () => "shared-key", cacheTime: 60000 });
      rB.fetch({ force: true });
      await delay(20);

      // Advance past scope A's TTL but not scope B's
      mockTime += 50;

      // flatView.get should skip scope A's expired entry and return scope B's entry
      const entry = resourceCache.map.get("shared-key");
      expect(entry).toBeDefined();
      expect(entry?.data).toBe("fresh");
    });
  });
});
