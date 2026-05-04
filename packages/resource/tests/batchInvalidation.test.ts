import { describe, test, expect, beforeEach } from "bun:test";
import { resourceCache } from "@hellajs/resource/bundle";

describe("resourceCache", () => {
  beforeEach(() => {
    resourceCache.map.clear();
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

    test("works with numeric keys converted to strings", () => {
      resourceCache.set(123, "data", 60000);
      resourceCache.set(124, "data", 60000);

      // Numbers as keys won't match string prefix, this is expected behavior
      const count = resourceCache.invalidateByPrefix("1");

      expect(count).toBe(0);
    });
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

  describe("practical use cases", () => {
    test("logout scenario - clear user-related caches", () => {
      resourceCache.set("user-profile", { name: "John" }, 60000);
      resourceCache.set("user-settings", { theme: "dark" }, 60000);
      resourceCache.set("session-token", { token: "abc" }, 60000);
      resourceCache.set("private-data", { secret: "xyz" }, 60000);
      resourceCache.set("public-config", { app: "myapp" }, 60000);

      // Clear all user/session/private caches on logout
      resourceCache.invalidateByPrefix("user-");
      resourceCache.invalidateByPrefix("session-");
      resourceCache.invalidateByPrefix("private-");

      expect(resourceCache.map.size).toBe(1);
      expect(resourceCache.get("public-config")).toBeDefined();
    });

    test("clear all todos with pattern", () => {
      resourceCache.set("todos-page-1", [], 60000);
      resourceCache.set("todos-page-2", [], 60000);
      resourceCache.set("todos-detail-1", {}, 60000);
      resourceCache.set("posts-page-1", [], 60000);

      resourceCache.invalidateByPattern(/^todos-/);

      expect(resourceCache.map.size).toBe(1);
      expect(resourceCache.get("posts-page-1")).toBeDefined();
    });
  });
});
