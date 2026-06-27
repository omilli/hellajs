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

    test("NaN triggers propagation due to reference equality", () => {
      const s = signal(NaN);

      const runs = mock(() => { s(); });
      effect(runs);
      expect(runs).toHaveBeenCalledTimes(1);

      // NaN !== NaN is true: setting NaN to NaN triggers propagation
      s(NaN);
      expect(runs).toHaveBeenCalledTimes(2);

      // Finite values behave normally
      s(1);
      expect(runs).toHaveBeenCalledTimes(3);

      // Same finite value: no propagation
      s(1);
      expect(runs).toHaveBeenCalledTimes(3);
    });
  });
});
