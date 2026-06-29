import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import {delay} from "@utils/test-helpers.js";
import { resource, resourceCache } from "@hellajs/resource/bundle";

describe("resource", () => {
  describe("cache isolation", () => {
    beforeEach(() => {
      resourceCache.setConfig({ maxSize: 1000, enableLRU: true });
    });

    afterEach(() => {
      resourceCache.map.clear();
    });

    test("different fetchers with same key do not collide", async () => {
      const userFetcher = (id: string) => delay({ type: "user", id }, 5);
      const postsFetcher = (id: string) => delay({ type: "posts", id }, 5);

      const userResource = resource(userFetcher, { key: () => "1", cacheTime: 60000 });
      const postsResource = resource(postsFetcher, { key: () => "1", cacheTime: 60000 });

      userResource.fetch({ force: true });
      await delay(20);

      postsResource.fetch({ force: true });
      await delay(20);

      expect(userResource.data()).toEqual({ type: "user", id: "1" });
      expect(postsResource.data()).toEqual({ type: "posts", id: "1" });
    });

    test("same fetcher with same key shares cache", async () => {
      const sharedFetcher = mock((key: string) => delay({ key, count: sharedFetcher.mock.calls.length }, 5));

      const r1 = resource(sharedFetcher, { key: () => "shared", cacheTime: 60000 });
      const r2 = resource(sharedFetcher, { key: () => "shared", cacheTime: 60000 });

      r1.fetch({ force: true });
      await delay(20);

      // Second resource hits cache because same fetcher + same key
      r2.fetch();
      await delay(20);

      expect(sharedFetcher).toHaveBeenCalledTimes(1);
      expect(r2.data()).toEqual({ key: "shared", count: 1 });
    });

    test("cache hit does not overwrite data from another resource", async () => {
      const userFetcher = () => delay({ name: "John" }, 5);
      const postsFetcher = () => delay([{ title: "Hello" }], 5);

      const userResource = resource(userFetcher, { key: () => "same-key", cacheTime: 60000 });
      const postsResource = resource(postsFetcher, { key: () => "same-key", cacheTime: 60000 });

      userResource.fetch({ force: true });
      await delay(20);

      postsResource.fetch({ force: true });
      await delay(20);

      // User data is still intact, not overwritten by posts
      userResource.fetch();
      expect(userResource.data()).toEqual({ name: "John" });

      // Posts data is also correct
      postsResource.fetch();
      expect(postsResource.data()).toEqual([{ title: "Hello" }]);
    });

    test("resourceCache.get finds entries across all scopes", async () => {
      const fetcher = () => delay("resource-data", 5);
      const r = resource(fetcher, { key: () => "find-me", cacheTime: 60000 });

      r.fetch({ force: true });
      await delay(20);

      expect(resourceCache.get<string>("find-me")).toBe("resource-data");
    });

    test("resourceCache.invalidateByPrefix works across all scopes", async () => {
      const fetcherA = () => delay("a", 5);
      const fetcherB = () => delay("b", 5);

      const rA = resource(fetcherA, { key: () => "user:1:profile", cacheTime: 60000 });
      const rB = resource(fetcherB, { key: () => "user:1:posts", cacheTime: 60000 });

      rA.fetch({ force: true });
      await delay(20);
      rB.fetch({ force: true });
      await delay(20);

      const count = resourceCache.invalidateByPrefix("user:1:");
      expect(count).toBe(2);
      expect(resourceCache.map.size).toBe(0);
    });

    test("resourceCache.invalidateAll clears all scopes", async () => {
      const fetcherA = () => delay("a", 5);
      const fetcherB = () => delay("b", 5);

      const rA = resource(fetcherA, { key: () => "key-a", cacheTime: 60000 });
      const rB = resource(fetcherB, { key: () => "key-b", cacheTime: 60000 });

      rA.fetch({ force: true });
      await delay(20);
      rB.fetch({ force: true });
      await delay(20);

      const count = resourceCache.invalidateAll();
      expect(count).toBe(2);
      expect(resourceCache.map.size).toBe(0);
    });

    test("resourceCache.map.size reflects total entries across scopes", async () => {
      const fetcherA = () => delay("a", 5);
      const fetcherB = () => delay("b", 5);

      const rA = resource(fetcherA, { key: () => "k1", cacheTime: 60000 });
      const rB = resource(fetcherB, { key: () => "k2", cacheTime: 60000 });

      rA.fetch({ force: true });
      await delay(20);
      expect(resourceCache.map.size).toBe(1);

      rB.fetch({ force: true });
      await delay(20);
      expect(resourceCache.map.size).toBe(2);
    });

    test("LRU eviction is global across fetcher scopes", async () => {
      resourceCache.setConfig({ maxSize: 2, enableLRU: true });

      const fetcherA = (key: string) => delay(`a-${key}`, 5);
      const fetcherB = (key: string) => delay(`b-${key}`, 5);

      const rA = resource(fetcherA, { key: () => "1", cacheTime: 60000 });
      const rB = resource(fetcherB, { key: () => "2", cacheTime: 60000 });
      const rC = resource(fetcherA, { key: () => "3", cacheTime: 60000 });

      rA.fetch({ force: true });
      await delay(20);
      rB.fetch({ force: true });
      await delay(20);

      // Cache is full (2/2), adding a third entry evicts the oldest (rA's entry)
      rC.fetch({ force: true });
      await delay(20);

      expect(resourceCache.map.size).toBe(2);

      // rA's entry was evicted, so it needs a fresh fetch
      const aFetcher = mock((key: string) => delay(`a-${key}-fresh`, 5));
      const rA2 = resource(aFetcher, { key: () => "1", cacheTime: 60000 });

      rA2.fetch();
      await delay(20);
      expect(aFetcher).toHaveBeenCalledTimes(1);
    });

    test("resourceCache.set writes to public scope separate from resource scopes", () => {
      resourceCache.set("manual-key", { manual: true }, 60000);

      expect(resourceCache.get<{ manual: boolean }>("manual-key")).toEqual({ manual: true });
      expect(resourceCache.map.size).toBe(1);
    });

    test("resourceCache.set and resource cache do not collide on same key", async () => {
      resourceCache.set("shared", "manual-data", 60000);

      const fetcher = () => delay("resource-data", 5);
      const r = resource(fetcher, { key: () => "shared", cacheTime: 60000 });

      r.fetch({ force: true });
      await delay(20);

      // Resource data does not overwrite manual data
      expect(r.data()).toBe("resource-data");

      // Both entries coexist in different scopes
      expect(resourceCache.map.size).toBe(2);
    });

    test("invalidate removes entries across all scopes with same key", async () => {
      const fetcherA = () => delay("a", 5);
      const fetcherB = () => delay("b", 5);

      const rA = resource(fetcherA, { key: () => "dup", cacheTime: 60000 });
      const rB = resource(fetcherB, { key: () => "dup", cacheTime: 60000 });

      rA.fetch({ force: true });
      await delay(20);
      rB.fetch({ force: true });
      await delay(20);

      // Invalidate by key removes from all scopes
      resourceCache.invalidate("dup");
      expect(resourceCache.map.size).toBe(0);
    });

    test("map.get finds entries across all scopes", async () => {
      const fetcher = () => delay({ value: 42 }, 5);
      const r = resource(fetcher, { key: () => "test-key", cacheTime: 60000 });

      r.fetch({ force: true });
      await delay(20);

      const entry = resourceCache.map.get("test-key");
      expect(entry?.data).toEqual({ value: 42 });
    });

    test("map.has checks across all scopes", async () => {
      const fetcher = () => delay("data", 5);
      const r = resource(fetcher, { key: () => "exists", cacheTime: 60000 });

      expect(resourceCache.map.has("exists")).toBe(false);

      r.fetch({ force: true });
      await delay(20);

      expect(resourceCache.map.has("exists")).toBe(true);
    });
  });
});
