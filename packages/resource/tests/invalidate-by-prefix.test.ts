import { describe, test, expect, beforeEach } from "bun:test";
import { resetTestState } from "@utils/test-helpers.js";
import { resourceCache } from "@hellajs/resource/bundle";

describe("resourceCache", () => {
  beforeEach(() => {
    resetTestState();
    resourceCache.setConfig({ maxSize: 1000, enableLRU: true });
  });

  describe("invalidateByPrefix", () => {
    test("invalidates entries starting with prefix", () => {
      resourceCache.set("user-1", { name: "John" }, 60000);
      resourceCache.set("user-2", { name: "Jane" }, 60000);
      resourceCache.set("user-profile-1", { bio: "Hello" }, 60000);
      resourceCache.set("post-1", { title: "First" }, 60000);

      const count = resourceCache.invalidateByPrefix("user-");

      expect(count).toBe(3);
      expect(resourceCache.get("user-1")).toBeUndefined();
      expect(resourceCache.get("user-2")).toBeUndefined();
      expect(resourceCache.get("user-profile-1")).toBeUndefined();
      expect(resourceCache.get("post-1")).toBeDefined();
    });

    test("returns 0 when no matches", () => {
      resourceCache.set("post-1", { title: "First" }, 60000);

      const count = resourceCache.invalidateByPrefix("user-");

      expect(count).toBe(0);
      expect(resourceCache.map.size).toBe(1);
    });

    test("does not match numeric keys with string prefix", () => {
      resourceCache.set(123, "data", 60000);
      resourceCache.set(124, "data", 60000);

      // Numbers as keys won't match string prefix, this is expected behavior
      const count = resourceCache.invalidateByPrefix("1");

      expect(count).toBe(0);
    });
  });
});
