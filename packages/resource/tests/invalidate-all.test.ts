import { describe, test, expect, beforeEach } from "bun:test";
import { resetTestState } from "@utils/test-helpers.js";
import { resourceCache } from "@hellajs/resource/bundle";

describe("resourceCache", () => {
  beforeEach(() => {
    resetTestState();
    resourceCache.setConfig({ maxSize: 1000, enableLRU: true });
  });

  describe("invalidateAll", () => {
    test("clears all cache entries", () => {
      resourceCache.set("user-1", { name: "John" }, 60000);
      resourceCache.set("user-2", { name: "Jane" }, 60000);
      resourceCache.set("post-1", { title: "First" }, 60000);

      const count = resourceCache.invalidateAll();

      expect(count).toBe(3);
      expect(resourceCache.map.size).toBe(0);
    });

    test("returns 0 when cache is empty", () => {
      const count = resourceCache.invalidateAll();

      expect(count).toBe(0);
    });
  });
});
