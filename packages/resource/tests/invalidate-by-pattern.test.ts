import { describe, test, expect, beforeEach } from "bun:test";
import { resetTestState } from "@utils/test-helpers.js";
import { resourceCache } from "@hellajs/resource/bundle";

describe("resourceCache", () => {
  beforeEach(() => {
    resetTestState();
    resourceCache.setConfig({ maxSize: 1000, enableLRU: true });
  });

  describe("invalidateByPattern", () => {
    test("invalidates entries matching regex pattern", () => {
      resourceCache.set("todos-1", { text: "First" }, 60000);
      resourceCache.set("todos-2", { text: "Second" }, 60000);
      resourceCache.set("todos-99", { text: "Ninety-nine" }, 60000);
      resourceCache.set("posts-1", { title: "Post" }, 60000);

      const count = resourceCache.invalidateByPattern(/^todos-\d+$/);

      expect(count).toBe(3);
      expect(resourceCache.get("todos-1")).toBeUndefined();
      expect(resourceCache.get("todos-2")).toBeUndefined();
      expect(resourceCache.get("todos-99")).toBeUndefined();
      expect(resourceCache.get("posts-1")).toBeDefined();
    });

    test("invalidates with complex patterns", () => {
      resourceCache.set("user:123:profile", { name: "John" }, 60000);
      resourceCache.set("user:456:profile", { name: "Jane" }, 60000);
      resourceCache.set("user:123:settings", { theme: "dark" }, 60000);
      resourceCache.set("session:abc", { token: "xyz" }, 60000);

      const count = resourceCache.invalidateByPattern(/^user:\d+:profile$/);

      expect(count).toBe(2);
      expect(resourceCache.get("user:123:profile")).toBeUndefined();
      expect(resourceCache.get("user:456:profile")).toBeUndefined();
      expect(resourceCache.get("user:123:settings")).toBeDefined();
      expect(resourceCache.get("session:abc")).toBeDefined();
    });

    test("returns 0 when no matches", () => {
      resourceCache.set("post-1", { title: "First" }, 60000);

      const count = resourceCache.invalidateByPattern(/^user-\d+$/);

      expect(count).toBe(0);
      expect(resourceCache.map.size).toBe(1);
    });
  });
});
