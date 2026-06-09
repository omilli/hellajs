import { describe, test, expect, mock } from "bun:test";
import { store, type Store } from "@hellajs/store/bundle";

describe("store", () => {
  test("basic operations and data types", () => {
    const data = store({
      num: 42,
      str: "hello",
      bool: true,
      arr: [1, 2, 3],
      obj: { nested: "value" },
      nullVal: null,
      undefinedVal: undefined,
      func: () => "helper"
    });

    expect(data.num()).toBe(42);
    expect(data.str()).toBe("hello");
    expect(data.bool()).toBe(true);
    expect(data.arr()).toEqual([1, 2, 3]);
    expect(data.obj.nested()).toBe("value");
    expect(data.nullVal()).toBe(null);
    expect(data.undefinedVal()).toBeUndefined();
    expect(data.func()).toBe("helper");

    data.num(100);
    data.str("world");
    data.obj.nested("updated");

    expect(data.num()).toBe(100);
    expect(data.str()).toBe("world");
    expect(data.obj.nested()).toBe("updated");
  });

  test("all data types combined with snapshot and update", () => {
    const data = store({
      count: 1,
      label: "test",
      active: true,
      items: [1, 2],
      meta: { version: 1 },
      nil: null,
      undef: undefined,
      helper: () => "fn"
    });

    // Snapshot includes all types
    const snap = data.snapshot();
    expect(snap.count).toBe(1);
    expect(snap.label).toBe("test");
    expect(snap.active).toBe(true);
    expect(snap.items).toEqual([1, 2]);
    expect(snap.meta).toEqual({ version: 1 });
    expect(snap.nil).toBe(null);
    expect(snap.undef).toBeUndefined();
    expect(snap.helper()).toBe("fn");
    expect("snapshot" in snap).toBe(false);
    expect("update" in snap).toBe(false);
    expect("cleanup" in snap).toBe(false);

    // Update across types
    data.update({
      count: 2,
      label: "updated",
      meta: { version: 2 }
    });

    expect(data.count()).toBe(2);
    expect(data.label()).toBe("updated");
    expect(data.meta.version()).toBe(2);
  });

  test("computed function inside store is reactive", () => {
    const data: Store<{ count: number; double: () => number }> = store({
      count: 0,
      double: computed(() => data.count() * 2)
    });

    expect(data.double()).toBe(0);

    data.count(5);
    expect(data.double()).toBe(10);

    data.count(3);
    expect(data.double()).toBe(6);
  });

  test("computed function inside store triggers effects", () => {
    const data: Store<{ count: number; double: () => number }> = store({
      count: 0,
      double: computed(() => data.count() * 2)
    });

    const tracker = mock((_value: number) => { _value })
    effect(() => { tracker(data.double()) })

    expect(tracker).toHaveBeenCalledTimes(1)
    expect(tracker).toHaveBeenNthCalledWith(1, 0)

    data.count(4)

    expect(tracker).toHaveBeenCalledTimes(2)
    expect(tracker).toHaveBeenNthCalledWith(2, 8)
  });

  test("computed function is preserved in snapshot", () => {
    const data: Store<{ count: number; double: () => number }> = store({
      count: 0,
      double: computed(() => data.count() * 2)
    });

    const snap = data.snapshot()
    expect(snap.double()).toBe(0)

    data.count(7)
    expect(snap.double()).toBe(14)
  });

  test("raw function reads live store state", () => {
    const data = store({
      count: 0,
      getCount: () => data.count()
    });

    expect(data.getCount()).toBe(0)

    data.count(42)
    expect(data.getCount()).toBe(42)
  });

  test("raw function in snapshot reflects current state", () => {
    const data = store({
      count: 0,
      logCount: () => `Count is ${data.count()}`
    });

    const snap = data.snapshot()
    expect(snap.logCount()).toBe("Count is 0")

    data.count(5)
    expect(snap.logCount()).toBe("Count is 5")
  });
});
