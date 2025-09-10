import { describe, test, expect, beforeEach } from "bun:test";
import { resource, resourceCache } from "../../packages/resource";

const delay = <T>(val: T, ms: number = 10): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(val), ms));

describe("resourceCache", () => {
  beforeEach(() => {
    resourceCache.map.clear();
    resourceCache.setConfig({ maxSize: 1000, enableLRU: true });
  });

  test("cleanupExpiredCache removes expired entries", async () => {
    resourceCache.set("key1", "data1", 10);
    resourceCache.set("key2", "data2", 50);

    expect(resourceCache.map.size).toBe(2);

    await delay(20);
    resourceCache.cleanup();

    expect(resourceCache.get<string>("key1")).toBeUndefined();
    expect(resourceCache.get<string>("key2")).toBe("data2");
    expect(resourceCache.map.size).toBe(1);
  });

  test("cleanupExpiredCache throttles to avoid excessive processing", async () => {
    resourceCache.map.clear();
    const originalNow = Date.now;
    let mockTime = Date.now() + 100000;
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

    Date.now = originalNow;
  });

  test("setCacheData with cacheTime=0 does nothing", () => {
    resourceCache.set("key1", "data1", 0);
    expect(resourceCache.map.size).toBe(0);
  });

  test("getCacheData updates lastAccess for LRU", async () => {
    const originalNow = Date.now;
    let mockTime = 1000;
    Date.now = () => mockTime;

    resourceCache.set("key1", "data1", 60000);
    const entry = resourceCache.map.get("key1");
    const originalAccess = entry?.lastAccess;

    mockTime += 100;
    resourceCache.get("key1");
    const updatedEntry = resourceCache.map.get("key1");
    expect(updatedEntry?.lastAccess).toBeGreaterThan(originalAccess!);

    Date.now = originalNow;
  });

  test("LRU eviction with sorting and multiple entries to evict", () => {
    // Configure small cache to force eviction
    resourceCache.setConfig({ maxSize: 3, enableLRU: true });

    const originalNow = Date.now;
    let mockTime = 1000;
    Date.now = () => mockTime;

    // Add entries with different access times
    resourceCache.set("key1", "data1", 60000); // oldest
    mockTime += 100;
    resourceCache.set("key2", "data2", 60000); // middle
    mockTime += 100;
    resourceCache.set("key3", "data3", 60000); // newest

    // Access key1 to make it more recently used than key2
    mockTime += 100;
    resourceCache.get("key1"); // Now key2 is the oldest

    // Add two more entries which should trigger eviction of 2 entries
    mockTime += 100;
    resourceCache.set("key4", "data4", 60000);
    mockTime += 100;
    resourceCache.set("key5", "data5", 60000); // This should trigger eviction of key2 and key3

    expect(resourceCache.map.size).toBe(3);
    expect(resourceCache.get("key1")).toBe("data1"); // Should still exist (was accessed)
    expect(resourceCache.get("key2")).toBeUndefined(); // Should be evicted (oldest)
    expect(resourceCache.get("key3")).toBeUndefined(); // Should be evicted (second oldest)
    expect(resourceCache.get("key4")).toBe("data4"); // Should exist
    expect(resourceCache.get("key5")).toBe("data5"); // Should exist

    Date.now = originalNow;
  });

  test("updateCacheData with function updater", () => {
    resourceCache.set("key1", "initial", 60000);

    const success = resourceCache.update("key1", (old) => `${old}-updated`);
    expect(success).toBe(true);
    expect(resourceCache.get<string>("key1")).toBe("initial-updated");
  });

  test("updateCacheData with direct value", () => {
    resourceCache.set("key1", "initial", 60000);

    const success = resourceCache.update("key1", "replaced");
    expect(success).toBe(true);
    expect(resourceCache.get<string>("key1")).toBe("replaced");
  });

  test("updateCacheData returns false for non-existent key", () => {
    const success = resourceCache.update("nonexistent", "value");
    expect(success).toBe(false);
  });

  test("updateCacheData returns false for expired entry", async () => {
    const originalNow = Date.now;
    let mockTime = 1000;
    Date.now = () => mockTime;

    resourceCache.set("key1", "data", 10);
    mockTime += 20;

    const success = resourceCache.update("key1", "updated");
    expect(success).toBe(false);
    expect(resourceCache.map.has("key1")).toBe(false);

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

  test("generateKeys returns template function", () => {
    const generator = resourceCache.generateKeys<{ id: number }>();
    const template = generator((params) => `user-${params.id}`);

    expect(template({ id: 1 })).toBe("user-1");
    expect(template({ id: 2 })).toBe("user-2");
  });

  test("createInvalidator calls invalidate on all resources", () => {
    const mockResource1 = { invalidate: (() => { }) as any };
    const mockResource2 = { invalidate: (() => { }) as any };

    let invalidate1Called = false;
    let invalidate2Called = false;

    mockResource1.invalidate = () => { invalidate1Called = true; };
    mockResource2.invalidate = () => { invalidate2Called = true; };

    resourceCache.createInvalidator([mockResource1, mockResource2]);

    expect(invalidate1Called).toBe(true);
    expect(invalidate2Called).toBe(true);
  });

  test("setData with function updater updates cached data", () => {
    const r = resource(() => delay("initial"), { cacheTime: 60000, key: () => "test-key" });

    resourceCache.set("test-key", "existing", 60000);
    const foo = resourceCache.get("test-key");
    foo;
    r.setData((old) => old ? `${old}-updated` : "updated");
    expect(resourceCache.get("test-key")).toBe("existing-updated");
  });

  test("setData with direct value updates cached data", () => {
    const r = resource(() => delay("initial"), { cacheTime: 60000, key: () => "test-key" });

    resourceCache.set("test-key", "existing", 60000);

    r.setData("replaced");
    expect(resourceCache.get<string>("test-key")).toBe("replaced");
  });

  test("setData with function when cache miss and cacheTime > 0", () => {
    const r = resource(() => delay("initial"), { cacheTime: 60000, key: () => "test-key" });

    r.setData((old) => old ? `${old}-updated` : "new");
    expect(resourceCache.get<string>("test-key")).toBe("new");
  });

  test("setData ignores update when cacheTime is 0", () => {
    const r = resource(() => delay("initial"), { cacheTime: 0, key: () => "test-key" });

    r.setData("should-not-be-cached");
    expect(resourceCache.get<string>("test-key")).toBeUndefined();
  });
});