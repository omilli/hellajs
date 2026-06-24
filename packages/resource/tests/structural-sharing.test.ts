import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { resource, resourceCache } from "@hellajs/resource/bundle";

describe("resource", () => {
  describe("structuralSharing", () => {
    beforeEach(() => {
      resourceCache.map.clear();
    });

    afterEach(() => {
      resourceCache.map.clear();
    });

    test("preserves nested references across identical fetches", async () => {
      type Data = { user: { name: string; age: number }; count: number };
      const r = resource<Data>(
        () => delay({ user: { name: "John", age: 30 }, count: 5 }),
        { structuralSharing: true }
      );

      r.fetch({ force: true });
      await delay(20);
      const firstUser = (r.data() as Data).user;

      r.fetch({ force: true });
      await delay(20);
      const secondUser = (r.data() as Data).user;

      expect(secondUser).toBe(firstUser);
    });

    test("keeps unchanged subtree references when a leaf changes", async () => {
      type Data = { profile: { name: string }; meta: { version: number } };
      let version = 0;
      const r = resource<Data>(
        () => delay({ profile: { name: "John" }, meta: { version } }),
        { structuralSharing: true }
      );

      r.fetch({ force: true });
      await delay(20);
      const firstProfile = (r.data() as Data).profile;

      version = 1;
      r.fetch({ force: true });
      await delay(20);
      const secondData = r.data() as Data;

      expect(secondData.meta.version).toBe(1);
      expect(secondData.profile).toBe(firstProfile);
    });

    test("preserves array element references for unchanged items", async () => {
      type Row = { id: number; value: number };
      type Data = { rows: Row[] };
      let secondValue = 20;
      const r = resource<Data>(
        () => delay({ rows: [{ id: 1, value: 10 }, { id: 2, value: secondValue }] }),
        { structuralSharing: true }
      );

      r.fetch({ force: true });
      await delay(20);
      const firstRowZero = (r.data() as Data).rows[0];

      secondValue = 99;
      r.fetch({ force: true });
      await delay(20);
      const secondData = r.data() as Data;

      expect(secondData.rows[1]!.value).toBe(99);
      expect(secondData.rows[0]).toBe(firstRowZero);
    });

    test("produces fresh references by default", async () => {
      type Data = { user: { name: string } };
      const r = resource<Data>(() => delay({ user: { name: "John" } }));

      r.fetch({ force: true });
      await delay(20);
      const firstUser = (r.data() as Data).user;

      r.fetch({ force: true });
      await delay(20);
      const secondUser = (r.data() as Data).user;

      expect(secondUser).not.toBe(firstUser);
    });

    test("falls back to fresh value when object keys differ", async () => {
      let useB = false;
      const r = resource(
        () => delay(useB ? { a: 1, c: 3 } : { a: 1, b: 2 }),
        { structuralSharing: true }
      );

      r.fetch({ force: true });
      await delay(20);

      useB = true;
      r.fetch({ force: true });
      await delay(20);

      expect(r.data()).toEqual({ a: 1, c: 3 });
    });

    test("applies transform after structural sharing", async () => {
      let version = 0;
      const r = resource(
        () => delay({ profile: { name: "John" }, version }),
        {
          structuralSharing: true,
          transform: (data) => ({ label: data.profile.name, v: data.version })
        }
      );

      r.fetch({ force: true });
      await delay(20);
      expect(r.data()).toEqual({ label: "John", v: 0 });

      version = 2;
      r.fetch({ force: true });
      await delay(20);
      expect(r.data()).toEqual({ label: "John", v: 2 });
    });

    test("cache stores structurally-shared result", async () => {
      type Data = { items: number[] };
      const r = resource(
        () => delay({ items: [1, 2, 3] }),
        {
          key: () => "shared-list",
          cacheTime: 60000,
          structuralSharing: true
        }
      );

      r.fetch({ force: true });
      await delay(20);
      const firstItems = (r.data() as Data).items;

      r.fetch({ force: true });
      await delay(20);

      const cached = resourceCache.get("shared-list") as Data;
      expect(cached.items).toBe(firstItems);
    });
  });
});
