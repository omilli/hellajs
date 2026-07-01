import { describe, test, expect, mock } from "bun:test";
import { computed, effect } from "@hellajs/core";
import { store } from "@hellajs/store/bundle";
import type { Store } from "@hellajs/store";

describe("store", () => {
  describe("functions", () => {
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

      const tracker = mock((_value: number) => { void _value; });
      effect(() => { tracker(data.double()); });

      expect(tracker).toHaveBeenCalledTimes(1);
      expect(tracker).toHaveBeenNthCalledWith(1, 0);

      data.count(4);

      expect(tracker).toHaveBeenCalledTimes(2);
      expect(tracker).toHaveBeenNthCalledWith(2, 8);
    });

    test("computed function is preserved in snapshot", () => {
      const data: Store<{ count: number; double: () => number }> = store({
        count: 0,
        double: computed(() => data.count() * 2)
      });

      const snap = data.snapshot();
      expect(snap.double()).toBe(0);

      data.count(7);
      expect(snap.double()).toBe(14);
    });

    test("raw function reads live store state", () => {
      const data = store({
        count: 0,
        getCount: () => data.count()
      });

      expect(data.getCount()).toBe(0);

      data.count(42);
      expect(data.getCount()).toBe(42);
    });

    test("raw function in snapshot reflects current state", () => {
      const data = store({
        count: 0,
        logCount: () => `Count is ${data.count()}`
      });

      const snap = data.snapshot();
      expect(snap.logCount()).toBe("Count is 0");

      data.count(5);
      expect(snap.logCount()).toBe("Count is 5");
    });
  });
});
