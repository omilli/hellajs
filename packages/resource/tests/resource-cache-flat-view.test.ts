import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { delay, resetTestState } from "@utils/test-helpers.js";
import { resource, resourceCache } from "@hellajs/resource/bundle";

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

    test("map.get returns undefined for a key no scope holds", () => {
      expect(resourceCache.map.get("no-such-key")).toBeUndefined();
    });

    test("map.has returns false for a key no scope holds", () => {
      expect(resourceCache.map.has("no-such-key")).toBe(false);
    });
  });
});
