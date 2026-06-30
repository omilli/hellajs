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
});
