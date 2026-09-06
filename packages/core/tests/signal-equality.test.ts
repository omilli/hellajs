import { describe, expect, test, mock } from "bun:test";
import { effect, signal } from "@hellajs/core";

describe("core", () => {
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
