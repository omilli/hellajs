import { describe, expect, test, mock } from "bun:test";
import { computed, effect, signal } from "@hellajs/core";

describe("core", () => {
  describe("signals", () => {
    test("signals store primitives and reference types", () => {
      // Primitives
      const num = signal(42);
      const str = signal("hello");
      const bool = signal(false);
      const nullable = signal<string | null>(null);
      const big = signal(123n);

      expect(num()).toBe(42);
      expect(str()).toBe("hello");
      expect(bool()).toBe(false);
      expect(nullable()).toBe(null);
      expect(big()).toBe(123n);

      // Reference types
      const obj = signal({ name: "Alice", age: 25 });
      const arr = signal([1, 2, 3]);
      const map = signal(new Map([["a", 1]]));
      const set = signal(new Set([1, 2]));
      const date = signal(new Date("2024-01-01"));
      const regex = signal(/^test$/);
      const fn = signal<() => string>(() => "initial");

      expect(obj().name).toBe("Alice");
      expect(arr()).toEqual([1, 2, 3]);
      expect(map().get("a")).toBe(1);
      expect(set().has(1)).toBe(true);
      expect(date().getFullYear()).toBe(2024);
      expect(regex().test("test")).toBe(true);
      expect(fn()()).toBe("initial");

      // Updates
      num(100);
      obj({ name: "Bob", age: 30 });
      fn(() => "updated");

      expect(num()).toBe(100);
      expect(obj().name).toBe("Bob");
      expect(fn()()).toBe("updated");
    });

    test("reference equality triggers updates on new object instances", () => {
      const obj = signal({ a: 1, b: 2 });
      const arr = signal([1, 2, 3]);

      const runs = mock(() => { obj(); arr(); });
      effect(runs);

      expect(runs).toHaveBeenCalledTimes(1);

      // New object instances trigger updates (reference equality)
      obj({ a: 1, b: 2 });
      expect(runs).toHaveBeenCalledTimes(2);

      arr([1, 2, 3]);
      expect(runs).toHaveBeenCalledTimes(3);

      // Same reference - no update
      const currentObj = obj();
      obj(currentObj);
      expect(runs).toHaveBeenCalledTimes(3);

      const currentArr = arr();
      arr(currentArr);
      expect(runs).toHaveBeenCalledTimes(3);
    });

    test("primitives use value equality", () => {
      const num = signal(42);
      const str = signal("hello");
      const bool = signal(false);

      const runs = mock(() => { num(); str(); bool(); });
      effect(runs);

      expect(runs).toHaveBeenCalledTimes(1);

      // Same primitive values - no update
      num(42);
      str("hello");
      bool(false);
      expect(runs).toHaveBeenCalledTimes(1);

      // Different values - updates
      num(100);
      expect(runs).toHaveBeenCalledTimes(2);

      str("world");
      expect(runs).toHaveBeenCalledTimes(3);

      bool(true);
      expect(runs).toHaveBeenCalledTimes(4);
    });

    test("signal without initial value returns undefined", () => {
      const s = signal<string>();
      expect(s()).toBeUndefined();
      s("hello");
      expect(s()).toBe("hello");
      s(undefined);
      expect(s()).toBeUndefined();
    });

    test("signal undefined initial value works in computed chain", () => {
      const name = signal<string>();
      const greeting = computed(() => `Hello, ${name() ?? "stranger"}`);

      expect(greeting()).toBe("Hello, stranger");

      name("Alice");
      expect(greeting()).toBe("Hello, Alice");

      name(undefined);
      expect(greeting()).toBe("Hello, stranger");
    });

    test("NaN-to-NaN writes do not propagate under the default equality", () => {
      const s = signal(NaN);

      const runs = mock(() => { s(); });
      effect(runs);
      expect(runs).toHaveBeenCalledTimes(1);

      // NaN is self-equal under the default: writing NaN over NaN skips the write
      s(NaN);
      expect(runs).toHaveBeenCalledTimes(1);

      // Finite transitions propagate normally
      s(1);
      expect(runs).toHaveBeenCalledTimes(2);

      // Same finite value: no propagation
      s(1);
      expect(runs).toHaveBeenCalledTimes(2);

      // Back to NaN is a real value change: propagates
      s(NaN);
      expect(runs).toHaveBeenCalledTimes(3);
      expect(Number.isNaN(s())).toBe(true);
    });
  });

  describe("signal equality option", () => {
    test("equals returning true suppresses propagation and keeps the old reference", () => {
      const todos = signal<{ id: number }[]>([{ id: 1 }], {
        equals: (a, b) => a.length === b.length && a.every((t, i) => t.id === b[i]!.id)
      });

      const runs = mock(() => { todos(); });
      effect(runs);
      expect(runs).toHaveBeenCalledTimes(1);

      const before = todos();
      todos([{ id: 1 }]); // Content-equal, new reference
      expect(runs).toHaveBeenCalledTimes(1); // No propagation
      expect(todos()).toBe(before); // Old reference kept
    });

    test("equals returning false propagates and stores the new value", () => {
      const todos = signal<{ id: number }[]>([{ id: 1 }], {
        equals: (a, b) => a.length === b.length && a.every((t, i) => t.id === b[i]!.id)
      });

      const runs = mock(() => { todos(); });
      effect(runs);

      todos([{ id: 1 }, { id: 2 }]); // Content-different
      expect(runs).toHaveBeenCalledTimes(2);
      expect(todos()).toEqual([{ id: 1 }, { id: 2 }]);
    });

    test("Object.is equals stabilizes NaN writes", () => {
      const s = signal(NaN, { equals: Object.is });

      const runs = mock(() => { s(); });
      effect(runs);
      expect(runs).toHaveBeenCalledTimes(1);

      s(NaN); // Object.is(NaN, NaN) is true: no propagation
      expect(runs).toHaveBeenCalledTimes(1);

      s(1); // Different value: propagates
      expect(runs).toHaveBeenCalledTimes(2);
    });

    test("equals compares against the freshest value across sequential writes", () => {
      const s = signal<number>(1, { equals: Object.is });

      const runs = mock(() => { s(); });
      effect(runs);

      s(2);
      expect(runs).toHaveBeenCalledTimes(2);

      s(1); // Back to a previous value: Object.is(2, 1) is false, propagates
      expect(runs).toHaveBeenCalledTimes(3);

      s(1); // Same as freshest: no propagation
      expect(runs).toHaveBeenCalledTimes(3);
    });

    test("signal without initial value accepts an options bag", () => {
      const s = signal<string | undefined>(undefined, { equals: Object.is });

      expect(s()).toBeUndefined();

      const runs = mock(() => { s(); });
      effect(runs);

      s("hello");
      expect(runs).toHaveBeenCalledTimes(2);
      expect(s()).toBe("hello");

      s(undefined);
      expect(runs).toHaveBeenCalledTimes(3);
      expect(s()).toBeUndefined();
    });

    test("empty options and undefined equals behave as default reference equality", () => {
      const withEmpty = signal(1, {});
      const withUndefined = signal(1, { equals: undefined });

      const runsEmpty = mock(() => { withEmpty(); });
      effect(runsEmpty);
      const runsUndefined = mock(() => { withUndefined(); });
      effect(runsUndefined);

      withEmpty(1); // Same reference/value: no propagation
      withUndefined(1);
      expect(runsEmpty).toHaveBeenCalledTimes(1);
      expect(runsUndefined).toHaveBeenCalledTimes(1);

      withEmpty(2);
      withUndefined(2);
      expect(runsEmpty).toHaveBeenCalledTimes(2);
      expect(runsUndefined).toHaveBeenCalledTimes(2);
    });

    test("non-function equals throws a validation error", () => {
      expect(() => signal(0, { equals: 42 as unknown as (a: number, b: number) => boolean }))
        .toThrow("[core] signal: equals must be a function, received number");
    });
  });
});
