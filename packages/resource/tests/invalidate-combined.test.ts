import { describe, test, expect, beforeEach } from "bun:test";
import { resetTestState } from "@utils/test-helpers.js";
import { resourceCache } from "@hellajs/resource/bundle";

describe("resourceCache", () => {
  beforeEach(() => {
    resetTestState();
    resourceCache.setConfig({ maxSize: 1000, enableLRU: true });
  });

  describe("combined invalidation", () => {
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
