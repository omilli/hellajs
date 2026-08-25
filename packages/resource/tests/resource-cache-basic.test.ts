import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { resetTestState } from "@utils/test-helpers.js";
import { resourceCache } from "@hellajs/resource/bundle";

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

  test("setConfig merges configuration", () => {
    resourceCache.setConfig({ maxSize: 500 });
    expect(resourceCache.config.maxSize).toBe(500);
    expect(resourceCache.config.enableLRU).toBe(true);

    resourceCache.setConfig({ enableLRU: false });
    expect(resourceCache.config.maxSize).toBe(500);
    expect(resourceCache.config.enableLRU).toBe(false);
  });

  test.each([
    "config",
    null,
    [1, 2],
    { maxSize: -1 },
    { maxSize: Number.NaN },
    { enableLRU: "yes" },
  ])("setConfig rejects invalid input %#", (input) => {
    expect(() => {
      // @ts-expect-error — intentionally invalid config shapes
      resourceCache.setConfig(input);
    }).toThrow("[resource] setConfig:");
  });

  test("setConfig rejection leaves config untouched and cache writes still work", () => {
    expect(() => resourceCache.setConfig({ maxSize: -1 })).toThrow("[resource] setConfig:");
    expect(resourceCache.config.maxSize).toBe(1000);

    resourceCache.set("key1", "data1", 60000);
    expect(resourceCache.map.size).toBe(1);
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
});
