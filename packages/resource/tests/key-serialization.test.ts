import { describe, test, expect, beforeEach, mock } from "bun:test";
import { delay, resetTestState } from "@utils/test-helpers.js";
import { resource, resourceCache } from "@hellajs/resource/bundle";

describe("resource", () => {
  describe("key serialization", () => {
    beforeEach(() => { resetTestState(); });

    test("cache-hits a second fetch with a structurally equal object key", async () => {
      const fetcher = mock(async (q: { page: number }) => ({ page: q.page }));
      await resourceCache.prefetch({ fetcher, key: { page: 1 }, cacheTime: 60_000 });

      const r = resource(fetcher, { key: { page: 1 }, cacheTime: 60_000 });
      const data = await r.fetch();

      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(data).toEqual({ page: 1 });
    });

    test("deduplicates concurrent fetches with equal-but-distinct object keys", async () => {
      const fetcher = mock(async (q: { page: number }) => {
        await delay(20);
        return { page: q.page };
      });

      const r1 = resource(fetcher, { key: { page: 1 } });
      const r2 = resource(fetcher, { key: { page: 1 } });
      await Promise.all([r1.fetch(), r2.fetch()]);

      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(r1.data()).toEqual({ page: 1 });
      expect(r2.data()).toEqual({ page: 1 });
    });

    test("matches object keys by shape regardless of property order, and array order exactly", () => {
      resourceCache.set({ a: 1, active: true, size: 2n, note: undefined, nil: null }, "obj", 60_000);
      expect(resourceCache.get<string>({ nil: null, note: undefined, size: 2n, active: true, a: 1 })).toBe("obj");
      expect(resourceCache.get({ a: 1 })).toBeUndefined();

      resourceCache.set([1, 2], "arr", 60_000);
      expect(resourceCache.get<string>([1, 2])).toBe("arr");
      expect(resourceCache.get([2, 1])).toBeUndefined();
    });

    test("normalizes nested objects and nested dates structurally", () => {
      resourceCache.set({ label: "q1", range: { from: new Date(1_000), to: new Date(2_000) } }, "data", 60_000);
      expect(resourceCache.get<string>({ range: { to: new Date(2_000), from: new Date(1_000) }, label: "q1" })).toBe("data");
      expect(resourceCache.get({ label: "q1", range: { from: new Date(1_000), to: new Date(3_000) } })).toBeUndefined();
    });

    test("does not collide a literal string key with a hashed key shape", () => {
      const forged = "\u0000" + JSON.stringify({ page: 1 });
      resourceCache.set(forged, "sentinel", 60_000);
      expect(resourceCache.get({ page: 1 })).toBeUndefined();

      resourceCache.set({ page: 1 }, "structural", 60_000);
      expect(resourceCache.get<string>(forged)).toBe("sentinel");
    });

    test("hits structurally equal object keys through resourceCache set, get, update, and map", () => {
      const roster = [{ id: 1, name: "Ada" }];
      resourceCache.set({ team: 1 }, roster, 60_000);
      expect(resourceCache.get<{ id: number; name: string }[]>({ team: 1 })).toBe(roster);
      expect(resourceCache.map.has({ team: 1 })).toBe(true);

      const updated = resourceCache.update<{ id: number; name: string }[]>(
        { team: 1 },
        (old) => [...(old ?? []), { id: 2, name: "Grace" }]
      );
      expect(updated).toBe(true);
      expect(resourceCache.get<{ id: number; name: string }[]>({ team: 1 })).toEqual([{ id: 1, name: "Ada" }, { id: 2, name: "Grace" }]);
    });

    test("keeps top-level dates and maps reference-keyed", () => {
      const when = new Date(1_000);
      resourceCache.set(when, "date-entry", 60_000);
      expect(resourceCache.get(new Date(1_000))).toBeUndefined();
      expect(resourceCache.get<string>(when)).toBe("date-entry");

      const mapKey = new Map([["team", 1]]);
      resourceCache.set(mapKey, "map-entry", 60_000);
      expect(resourceCache.get(new Map([["team", 1]]))).toBeUndefined();
      expect(resourceCache.get<string>(mapKey)).toBe("map-entry");

      const nestedMapKey = { filter: new Map([["team", 1]]) };
      resourceCache.set(nestedMapKey, "nested-map-entry", 60_000);
      expect(resourceCache.get({ filter: new Map([["team", 1]]) })).toBeUndefined();
      expect(resourceCache.get<string>(nestedMapKey)).toBe("nested-map-entry");
    });
  });
});
