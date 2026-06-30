import { describe, test, expect, beforeEach, mock } from "bun:test";
import { resetTestState } from "@utils/test-helpers.js";
import { resourceCache } from "@hellajs/resource/bundle";

describe("resourceCache", () => {
  beforeEach(() => {
    resetTestState();
    resourceCache.setConfig({ maxSize: 1000, enableLRU: true });
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
});
