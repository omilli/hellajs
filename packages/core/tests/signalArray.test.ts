import { describe, test, expect, mock } from "bun:test";
import { signalArray, effect, batch, untracked } from "@hellajs/core";

describe("signalArray", () => {
  test("wakes only the reader of the written index", () => {
    const items = signalArray([1, 2, 3]);
    const first = mock((value: number | undefined) => value);
    effect(() => first(items.get(0)));
    expect(first).toHaveBeenCalledTimes(1);
    items.set(1, 20);
    expect(first).toHaveBeenCalledTimes(1);
    items.set(0, 10);
    expect(first).toHaveBeenCalledTimes(2);
    expect(first).toHaveBeenLastCalledWith(10);
  });

  test("positional readers observe shifted values after splice", () => {
    const items = signalArray([1, 2, 3]);
    const second = mock((value: number | undefined) => value);
    effect(() => second(items.get(1)));
    expect(second).toHaveBeenLastCalledWith(2);
    items.splice(0, 1);
    expect(second).toHaveBeenCalledTimes(2);
    expect(second).toHaveBeenLastCalledWith(3); // The element formerly at index 2 shifted into position 1
  });

  test("nodeAt handles ignore relocation but observe value writes", () => {
    const items = signalArray([1, 2, 3]);
    const handle = items.nodeAt(2)!;
    const reader = mock((value: number) => value);
    effect(() => reader(handle()));
    items.splice(0, 1); // The element moves from index 2 to index 1
    expect(reader).toHaveBeenCalledTimes(1);
    items.set(1, 20); // Writes the relocated element
    expect(reader).toHaveBeenCalledTimes(2);
    expect(reader).toHaveBeenLastCalledWith(20);
  });

  test("push, pop, insert, and splice match native array semantics", () => {
    const empty = signalArray<number>();
    expect(empty()).toEqual([]);
    expect(empty.pop()).toBeUndefined();

    const items = signalArray<number>([1, 2, 3]);
    const native = [1, 2, 3];
    expect(items.push(4, 5)).toBe(native.push(4, 5));
    expect(items()).toEqual(native);
    expect(items.pop()).toBe(native.pop());
    items.insert(1, 9);
    native.splice(1, 0, 9);
    expect(items()).toEqual(native);
    items.insert(0); // Empty insert: no structural change
    expect(items()).toEqual(native);
    const removed = items.splice(-2, 1, 7, 8);
    const nativeRemoved = native.splice(-2, 1, 7, 8);
    expect(removed).toEqual(nativeRemoved);
    expect(items()).toEqual(native);
    items.splice(9, 0); // No-op splice: no structural change
    expect(items()).toEqual(native);
    expect(items.length()).toBe(native.length);
    items.set(9, 99); // Past the end: extends like native indexed assignment
    native[9] = 99;
    expect(items()).toEqual(native);
    items.set(-1, 0); // Negative index: never addresses an element
    expect(items()).toEqual(native);
  });

  test("out-of-bounds get returns undefined and wakes when growth reaches the index", () => {
    const items = signalArray([1]);
    const reader = mock((value: number | undefined) => value);
    effect(() => reader(items.get(2)));
    expect(reader).toHaveBeenLastCalledWith(undefined);
    items.push(2, 3);
    expect(reader).toHaveBeenCalledTimes(2);
    expect(reader).toHaveBeenLastCalledWith(3);
  });

  test("the callable returns a fresh plain array and tracks every change", () => {
    const items = signalArray([1, 2]);
    const snapshot = items();
    expect(snapshot).toEqual([1, 2]);
    snapshot.push(99);
    expect(items.length()).toBe(2); // Mutating the snapshot never touches the container

    const reader = mock((values: number[]) => values);
    effect(() => reader(items()));
    items.set(0, 10);
    expect(reader).toHaveBeenCalledTimes(2);
    items.push(3);
    expect(reader).toHaveBeenCalledTimes(3);
    expect(reader).toHaveBeenLastCalledWith([10, 2, 3]);
  });

  test("the reconcile-setter skips equal elements and applies the position diff", () => {
    const items = signalArray([1, 2, 3]);
    const zero = mock((value: number | undefined) => value);
    effect(() => zero(items.get(0)));
    items([1, 2, 30]); // Element 0 equal: index-0 readers do not rerun
    expect(zero).toHaveBeenCalledTimes(1);

    const second = mock((value: number | undefined) => value);
    effect(() => second(items.get(2)));
    items([1, 2, 31]); // Changed index 2 only
    expect(zero).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(2);
    expect(second).toHaveBeenLastCalledWith(31);

    items([5]); // Removal: positional readers wake and read undefined past the end
    expect(second).toHaveBeenCalledTimes(3);
    expect(second).toHaveBeenLastCalledWith(undefined);
  });

  test("map and forEach readers wake on element writes and structural ops", () => {
    const items = signalArray([1, 2]);
    const doubled = mock((values: number[]) => values);
    effect(() => doubled(items.map((value) => value * 2)));
    expect(doubled).toHaveBeenLastCalledWith([2, 4]);
    items.set(0, 5);
    expect(doubled).toHaveBeenCalledTimes(2);
    items.push(6);
    expect(doubled).toHaveBeenCalledTimes(3);
    expect(doubled).toHaveBeenLastCalledWith([10, 4, 12]);

    const each = mock((value: number) => value);
    effect(() => items.forEach(each));
    expect(each).toHaveBeenCalledTimes(3);
    items.set(1, 9);
    expect(each).toHaveBeenCalledTimes(6);
  });

  test("mutations inside batch propagate once", () => {
    const items = signalArray([1, 2]);
    const reader = mock((values: number[]) => values);
    effect(() => reader(items()));
    batch(() => {
      items.set(0, 10);
      items.push(3);
    });
    expect(reader).toHaveBeenCalledTimes(2);
    expect(reader).toHaveBeenLastCalledWith([10, 2, 3]);
  });

  test("reads inside untracked subscribe to nothing", () => {
    const items = signalArray([1]);
    const reader = mock((value: number | undefined) => value);
    effect(() => reader(untracked(() => items.get(0))));
    items.set(0, 5);
    items.push(2);
    expect(reader).toHaveBeenCalledTimes(1);
  });

  test("options.equals gates child writes per element", () => {
    const items = signalArray([{ n: 1 }], { equals: (a, b) => a.n === b.n });
    const reader = mock((value: { n: number } | undefined) => value);
    effect(() => reader(items.get(0)));
    items.set(0, { n: 1 }); // Content-equal: write skipped
    expect(reader).toHaveBeenCalledTimes(1);
    items.set(0, { n: 2 });
    expect(reader).toHaveBeenCalledTimes(2);
    expect(reader).toHaveBeenLastCalledWith({ n: 2 });
  });

  test("throws when options members are not functions", () => {
    expect(() => signalArray([1], { equals: 1 as unknown as undefined })).toThrow(
      "[core] signalArray: equals must be a function, received number"
    );
    expect(() => signalArray([1], { wrap: "x" as unknown as undefined })).toThrow(
      "[core] signalArray: wrap must be a function, received string"
    );
    expect(() => signalArray([1], { merge: true as unknown as undefined })).toThrow(
      "[core] signalArray: merge must be a function, received boolean"
    );
  });

  test("throws on structurally invalid input", () => {
    expect(() => signalArray(42 as unknown as number[])).toThrow(
      "[core] signalArray: initial must be an array, received number"
    );
    const items = signalArray([1, 2, 3]);
    expect(() => items(42 as unknown as number[])).toThrow(
      "[core] signalArray: value must be an array, received number"
    );
    expect(items()).toEqual([1, 2, 3]); // The rejected input leaves the container untouched
    expect(items.length()).toBe(3);
  });

  test("accepts the valid input boundaries", () => {
    const noSeed = signalArray<number>();
    expect(noSeed()).toEqual([]);
    expect(signalArray<number>([])()).toEqual([]);
    const items = signalArray([1, 2]);
    items([]); // Reconciling to an empty array is a legal structural write
    expect(items()).toEqual([]);
  });

  describe("element lifecycle hooks", () => {
    test("wrap converts every element entering a node", () => {
      const tag = (element: string) => `:${element}`;
      const seeded = signalArray(["a"], { wrap: tag });
      expect(seeded()).toEqual([":a"]);

      const items = signalArray(["a"], { wrap: tag });
      items.push("b");
      items.set(0, "c");
      items.insert(1, "z");
      items.splice(2, 0, "y");
      items(["c", "z", "y", "b", "d"]); // Reconcile-setter input is raw: wrap applies inside
      expect(items()).toEqual([":c", ":z", ":y", ":b", ":d"]);
    });

    test("merge intercepts writes to existing nodes", () => {
      const merge = mock<(prev: { n: number }, next: { n: number }) => boolean>((prev, next) => {
        prev.n = next.n;
        return true;
      });
      const items = signalArray([{ n: 1 }], { merge });
      const handle = items.nodeAt(0)!;
      const reader = mock((value: { n: number }) => value);
      effect(() => reader(handle()));
      items.set(0, { n: 5 });
      expect(reader).toHaveBeenCalledTimes(1); // Handled in place: no child write
      expect(handle().n).toBe(5); // The mutation is visible through the node value
      expect(merge).toHaveBeenCalledTimes(1);

      const falling = signalArray([{ n: 1 }], {
        merge: () => false,
        wrap: (element) => ({ ...element }),
      });
      const freshHandle = falling.nodeAt(0)!;
      const fallReader = mock((value: { n: number }) => value);
      effect(() => fallReader(freshHandle()));
      falling.set(0, { n: 2 }); // merge declines: default wrap/equals/write path
      expect(fallReader).toHaveBeenCalledTimes(2);
      expect(freshHandle().n).toBe(2);
    });

    test("merge sees the raw incoming value before wrap applies", () => {
      type Item = { n: number; tag?: boolean };
      const merge = mock<(prev: Item, next: Item) => boolean>(() => false);
      const items = signalArray<Item>([{ n: 1 }], {
        wrap: (element) => ({ ...element, tag: true }),
        merge,
      });
      items.set(0, { n: 2 });
      expect(merge).toHaveBeenCalledWith({ n: 1, tag: true }, { n: 2 }); // prev wrapped, next raw
      expect(items.nodeAt(0)!()).toEqual({ n: 2, tag: true });
    });
  });
});
