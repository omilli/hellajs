import { describe, test, expect, mock } from "bun:test";
import { effect } from "@hellajs/core";
import { store } from "@hellajs/store/bundle";
import type { StoreEquals } from "@hellajs/store";

describe("store", () => {
describe("equals", () => {
  test("skips equal-content array writes and keeps the old reference", () => {
    const data = store({ items: [1, 2] }, { equals: { items: "structural" } });
    const original = data.items();
    const tracker = mock(() => {});
    effect(() => { data.items(); tracker(); });

    expect(tracker).toHaveBeenCalledTimes(1);
    data.items([1, 2]);

    expect(tracker).toHaveBeenCalledTimes(1);
    expect(data.items()).toBe(original);
  });

  test("compares Date leaves by time with 'structural'", () => {
    const data = store({ when: new Date("2026-01-01T00:00:00Z") }, { equals: { when: "structural" } });
    const tracker = mock(() => {});
    effect(() => { data.when(); tracker(); });

    data.when(new Date("2026-01-01T00:00:00Z"));
    expect(tracker).toHaveBeenCalledTimes(1);
    expect(data.when().getTime()).toBe(new Date("2026-01-01T00:00:00Z").getTime());

    data.when(new Date("2026-01-02T00:00:00Z"));
    expect(tracker).toHaveBeenCalledTimes(2);
    expect(data.when().getTime()).toBe(new Date("2026-01-02T00:00:00Z").getTime());
  });

  test("custom comparator suppresses equal writes and propagates unequal ones", () => {
    const data = store({ count: 0 }, {
      equals: { count: (prev: number, next: number) => Math.abs(next - prev) < 3 }
    });
    const tracker = mock(() => {});
    effect(() => { data.count(); tracker(); });

    data.count(2);
    expect(tracker).toHaveBeenCalledTimes(1);
    expect(data.count()).toBe(0);

    data.count(10);
    expect(tracker).toHaveBeenCalledTimes(2);
    expect(data.count()).toBe(10);
  });

  test("threads nested equals maps into nested stores", () => {
    const data = store({ user: { name: "a" } }, { equals: { user: { name: () => true } } });
    const tracker = mock(() => {});
    effect(() => { data.user.name(); tracker(); });

    data.user.name("b");
    expect(tracker).toHaveBeenCalledTimes(1);
    expect(data.user.name()).toBe("a");
  });

  test("runs equality after middleware on the transformed value", () => {
    const comparator = mock<(prev: string, next: string) => boolean>(() => true);
    const data = store({ name: "A" }, {
      middleware: { name: (v: string) => v.toUpperCase() },
      equals: { name: comparator }
    });
    const tracker = mock(() => {});
    effect(() => { data.name(); tracker(); });

    data.name("b");
    expect(comparator).toHaveBeenCalledWith("A", "B");
    expect(tracker).toHaveBeenCalledTimes(1);
  });

  test("update(partial) inherits the leaf comparator", () => {
    const data = store({ items: [1, 2] }, { equals: { items: "structural" } });
    const original = data.items();
    const tracker = mock(() => {});
    effect(() => { data.items(); tracker(); });

    data.update({ items: [1, 2] });

    expect(tracker).toHaveBeenCalledTimes(1);
    expect(data.items()).toBe(original);
  });

  test("update(draft) with an equal-content array writes nothing to the signal", () => {
    const data = store({ items: [1, 2] }, { equals: { items: "structural" } });
    const original = data.items();
    const tracker = mock(() => {});
    effect(() => { data.items(); tracker(); });

    data.update(draft => { draft.items = [1, 2]; });

    expect(tracker).toHaveBeenCalledTimes(1);
    expect(data.items()).toBe(original);
  });

  test("throws at create time for an invalid equals value", () => {
    expect(() => store({ count: 0 }, {
      equals: {
        // @ts-expect-error 42 is neither a comparator nor "structural" — create must reject it
        count: 42
      }
    })).toThrow('[store] store: equals for "count" must be a function or "structural", received number');
  });

  test("ignores equals entries for keys the store does not define", () => {
    const extra = { ghost: "structural" } as StoreEquals<{ a: string }>;
    const data = store({ a: "hello" }, { equals: extra });

    data.a("world");
    expect(data.a()).toBe("world");
  });
});
});
