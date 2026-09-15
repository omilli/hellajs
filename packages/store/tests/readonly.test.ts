import { describe, test, expect, mock } from "bun:test";
import { effect } from "@hellajs/core";
import { store } from "@hellajs/store/bundle";
import type { Store } from "@hellajs/store";

describe("store", () => {
  describe("readonly", () => {
    test("all properties readonly", () => {
      const readonlyAll = store({ key: "value" }, { readonly: true });

      expect(readonlyAll.key()).toBe("value");
      expect(readonlyAll.key.length).toBe(0);
    });

    test("specific properties readonly", () => {
      const readonlyPartial = store({
        title: "Book",
        year: 2023,
        rating: 4.5
      }, { readonly: ["title"] });

      expect(readonlyPartial.title()).toBe("Book");
      readonlyPartial.year(2024);
      readonlyPartial.rating(5.0);

      expect(readonlyPartial.year()).toBe(2024);
      expect(readonlyPartial.rating()).toBe(5.0);
    });

    test("readonly properties throw via update()", () => {
      const data = store({ locked: "original", writable: "a" }, { readonly: ["locked"] });

      expect(() => data.$update({ locked: "new", writable: "b" })).toThrow('[store] readonly key "locked"');

      expect(data.locked()).toBe("original");
      expect(data.writable()).toBe("a");
    });

    test("readonly: true setter throws at runtime", () => {
      const data = store({ count: 0, name: "init" }, { readonly: true });

      expect(() => (data.count as unknown as (v: number) => void)(999)).toThrow('[store] readonly key "count"');

      expect(data.count()).toBe(0);
      expect(data.name()).toBe("init");
    });

    test("readonly combined with middleware", () => {
      const data = store(
        { count: 0, name: "init" },
        { readonly: ["count"], middleware: { name: (v: string) => v.toUpperCase() } }
      );

      data.name("lower");
      expect(data.name()).toBe("LOWER");
      expect(data.count()).toBe(0);
    });

    test("readonly: true propagates into nested objects", () => {
      const data = store({
        config: { theme: "dark", lang: "en" }
      }, { readonly: true });

      expect(data.config.theme()).toBe("dark");
      expect(data.config.theme.length).toBe(0);

      // @ts-expect-error theme is a readonly getter () => string one level down, not a Signal
      expect(() => data.config.theme("light")).toThrow('[store] readonly key "theme"');

      expect(data.config.theme()).toBe("dark");
    });

    test("array-listed object key is deep-readonly", () => {
      const data = store({
        config: { theme: "dark" },
        name: "app"
      }, { readonly: ["config"] });

      expect(data.config.theme()).toBe("dark");
      // @ts-expect-error listed object key recurses: theme is a getter, not a Signal
      expect(() => data.config.theme("light")).toThrow('[store] readonly key "theme"');

      expect(data.config.theme()).toBe("dark");

      data.name("changed");
      expect(data.name()).toBe("changed");
    });

    test("intermediate objects two levels down are typed readonly", () => {
      const data = store({
        settings: { ui: { theme: "dark" } }
      }, { readonly: true });

      // settings.ui exposes Store<T[K], keyof T[K]> — each level derives its own full key set
      const ui: Store<{ theme: string }, "theme"> = data.settings.ui;

      // @ts-expect-error theme is a getter two levels down, not a Signal
      expect(() => ui.theme("light")).toThrow('[store] readonly key "theme"');

      expect(ui.theme()).toBe("dark");
    });

    test("snapshot stays reactive across a deep-readonly tree", () => {
      const data = store({
        config: { theme: "dark" },
        counter: 0
      }, { readonly: ["config"] });

      const tracker = mock(() => {});
      effect(() => {
        data.$snapshot();
        tracker();
      });

      expect(tracker).toHaveBeenCalledTimes(1);
      expect(data.$snapshot().config.theme).toBe("dark");

      data.counter(1);

      expect(tracker).toHaveBeenCalledTimes(2);
    });

    test("middleware threads with deep readonly on the same nested key", () => {
      const data = store(
        { user: { name: "alice" } },
        {
          readonly: ["user"],
          middleware: { user: { name: (value: string) => value.toUpperCase() } }
        }
      );

      // signal → middleware → throwing guard: the readonly guard sits above the middleware, so
      // nested leaf writes throw (matches top-level readonly + middleware composition)
      // @ts-expect-error user.name is a getter () => string, not a Signal
      expect(() => data.user.name("bob")).toThrow('[store] readonly key "name"');

      expect(data.user.name()).toBe("alice");
    });

    test("readonly array property is a no-op getter", () => {
      const data = store({
        items: [1, 2, 3],
        name: "list"
      }, { readonly: true });

      expect(data.items()).toEqual([1, 2, 3]);
      // Contract change (deep collections): readonly collection keys forward the
      // container's reader methods for JS callers (the typed surface is the plain
      // getter), so `length` reads granularly — not the old bare-getter's arity
      expect((data.items as unknown as { length(): number }).length()).toBe(3);
    });

    test("readonly array setter throws at runtime", () => {
      const data = store({
        items: [1, 2, 3]
      }, { readonly: true });

      expect(() => (data.items as unknown as (v: number[]) => void)([4, 5, 6])).toThrow('[store] readonly key "items"');

      expect(data.items()).toEqual([1, 2, 3]);
    });

    test("specific readonly keys include array property", () => {
      const data = store({
        items: [1, 2],
        name: "mutable"
      }, { readonly: ["items"] });

      expect(() => (data.items as unknown as (v: number[]) => void)([9])).toThrow('[store] readonly key "items"');

      expect(data.items()).toEqual([1, 2]);
      data.name("changed");
      expect(data.name()).toBe("changed");
    });

    test("deep-readonly nested keys throw via update()", () => {
      const data = store({
        config: { theme: "dark" },
        name: "app"
      }, { readonly: ["config"] });

      expect(() => data.$update({ config: { theme: "light" }, name: "changed" })).toThrow('[store] readonly key "theme"');

      expect(data.config.theme()).toBe("dark");
      expect(data.name()).toBe("app");
    });

    // Contract change (deep collections): `nodeAt`/`entry` return writable core
    // handles, so the readonly guard stubs them out fail-closed — writes through
    // them throw instead of mutating (array) or silently no-oping (Map)
    test("readonly array nodeAt handle throws and leaves the container unchanged", () => {
      const data = store({
        items: [1, 2, 3]
      }, { readonly: true });

      expect(() => (data.items as unknown as { nodeAt(i: number): (v?: number) => void }).nodeAt(0)(99)).toThrow('[store] readonly key "items"');

      expect(data.items()).toEqual([1, 2, 3]);
    });

    test("readonly Map entry handle throws instead of silently no-oping", () => {
      const data = store({
        counts: new Map([["a", 1]])
      }, { readonly: true });

      expect(() => (data.counts as unknown as { entry(k: string): (v?: number) => void }).entry("a")(99)).toThrow('[store] readonly key "counts"');

      expect(data.counts().get("a")).toBe(1);
    });

    test("readonly containers keep the reader surface: bare call, get, length, size, map, forEach", () => {
      const data = store({
        items: [1, 2, 3],
        counts: new Map([["a", 1]])
      }, { readonly: true });

      expect(data.items()).toEqual([1, 2, 3]);
      expect((data.items as unknown as { length(): number }).length()).toBe(3);
      expect((data.items as unknown as { get(i: number): number }).get(1)).toBe(2);
      expect((data.items as unknown as { map(fn: (v: number) => number): number[] }).map(v => v * 2)).toEqual([2, 4, 6]);
      const seen: number[] = [];
      (data.items as unknown as { forEach(fn: (v: number) => void): void }).forEach(v => seen.push(v));
      expect(seen).toEqual([1, 2, 3]);
      expect(data.counts().get("a")).toBe(1);
      expect((data.counts as unknown as { size(): number }).size()).toBe(1);
      expect((data.counts as unknown as { get(k: string): number }).get("a")).toBe(1);
    });

    test("writable collections still forward nodeAt and entry", () => {
      const data = store({
        items: [1, 2, 3],
        counts: new Map([["a", 1]])
      });

      // nodeAt returns a writable child Signal — the write applies
      (data.items as unknown as { nodeAt(i: number): (v?: number) => void }).nodeAt(0)(99);
      expect((data.items as unknown as { get(i: number): number }).get(0)).toBe(99);

      // entry returns a computed handle (writes are ignored by core, even here);
      // forwarding means the handle is live — its read tracks a later update
      const handle = (data.counts as unknown as { entry(k: string): () => number }).entry("a");
      expect(handle()).toBe(1);
      data.$update({ counts: new Map([["a", 42]]) });
      expect(handle()).toBe(42);
      expect((data.counts as unknown as { get(k: string): number }).get("a")).toBe(42);
    });
  });
});
