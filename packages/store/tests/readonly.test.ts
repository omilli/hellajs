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

    test("readonly properties not updated via update()", () => {
      const data = store({ locked: "original", writable: "a" }, { readonly: ["locked"] });

      data.update({ locked: "new", writable: "b" });

      expect(data.locked()).toBe("original");
      expect(data.writable()).toBe("b");
    });

    test("readonly: true setter is a no-op at runtime", () => {
      const data = store({ count: 0, name: "init" }, { readonly: true });

      ;(data.count as unknown as (v: number) => void)(999);

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

      // 02-loud-writes not landed: setter is a silent no-op; flips to toThrow once it lands
      // @ts-expect-error theme is a readonly getter () => string one level down, not a Signal
      data.config.theme("light");

      expect(data.config.theme()).toBe("dark");
    });

    test("array-listed object key is deep-readonly", () => {
      const data = store({
        config: { theme: "dark" },
        name: "app"
      }, { readonly: ["config"] });

      expect(data.config.theme()).toBe("dark");
      // @ts-expect-error listed object key recurses: theme is a getter, not a Signal
      data.config.theme("light");

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
      ui.theme("light");

      expect(ui.theme()).toBe("dark");
    });

    test("snapshot stays reactive across a deep-readonly tree", () => {
      const data = store({
        config: { theme: "dark" },
        counter: 0
      }, { readonly: ["config"] });

      const tracker = mock(() => {});
      effect(() => {
        data.snapshot();
        tracker();
      });

      expect(tracker).toHaveBeenCalledTimes(1);
      expect(data.snapshot().config.theme).toBe("dark");

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

      // signal → middleware → computed: the readonly wrap sits above the middleware, so the
      // nested leaf stays a getter and writes are silent no-ops (matches top-level composition)
      // @ts-expect-error user.name is a getter () => string, not a Signal
      data.user.name("bob");

      expect(data.user.name()).toBe("alice");
    });

    test("readonly array property is a no-op getter", () => {
      const data = store({
        items: [1, 2, 3],
        name: "list"
      }, { readonly: true });

      expect(data.items()).toEqual([1, 2, 3]);
      expect(data.items.length).toBe(0);
    });

    test("readonly array setter is a no-op at runtime", () => {
      const data = store({
        items: [1, 2, 3]
      }, { readonly: true });

      ;(data.items as unknown as (v: number[]) => void)([4, 5, 6]);

      expect(data.items()).toEqual([1, 2, 3]);
    });

    test("specific readonly keys include array property", () => {
      const data = store({
        items: [1, 2],
        name: "mutable"
      }, { readonly: ["items"] });

      ;(data.items as unknown as (v: number[]) => void)([9]);

      expect(data.items()).toEqual([1, 2]);
      data.name("changed");
      expect(data.name()).toBe("changed");
    });

    test("deep-readonly nested keys are not writable via update()", () => {
      const data = store({
        config: { theme: "dark" },
        name: "app"
      }, { readonly: ["config"] });

      data.update({ config: { theme: "light" }, name: "changed" });

      expect(data.config.theme()).toBe("dark");
      expect(data.name()).toBe("changed");
    });
  });
});
