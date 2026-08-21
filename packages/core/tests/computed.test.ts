import { describe, expect, test, mock } from "bun:test";
import { computed, effect, signal } from "@hellajs/core";

describe("core", () => {
  describe("computed", () => {
    test("computed derives and chains values with caching", () => {
      const firstName = signal("John");
      const lastName = signal("Doe");
      const price = signal(100);
      const quantity = signal(2);
      const discount = signal(0.1);

      // Simple derivation
      const fullName = computed(() => `${firstName()} ${lastName()}`);
      expect(fullName()).toBe("John Doe");

      // Chained derivation with compute tracking
      const subtotalTracker = mock(() => price() * quantity());
      const subtotal = computed(subtotalTracker);
      const discountAmount = computed(() => subtotal() * discount());
      const total = computed(() => subtotal() - discountAmount());

      // Subscribe to trigger computation
      effect(() => { total(); });
      expect(subtotalTracker).toHaveBeenCalledTimes(1);
      expect(total()).toBe(180);

      // Updates propagate through chain
      firstName("Jane");
      quantity(3);
      expect(fullName()).toBe("Jane Doe");
      expect(total()).toBe(270);
      expect(subtotalTracker).toHaveBeenCalledTimes(2);

      // Same value doesn't recompute
      quantity(3);
      expect(subtotalTracker).toHaveBeenCalledTimes(2);
    });

    test("computed receives previous value", () => {
      const items = signal<number[]>([]);
      const total = computed((prev: { sum: number; count: number } = { sum: 0, count: 0 }) => {
        const current = items();
        const newItems = current.slice(prev.count);
        const newSum = newItems.reduce((s, v) => s + v, 0);
        return { sum: prev.sum + newSum, count: current.length };
      });

      expect(total()).toEqual({ sum: 0, count: 0 });

      items([10, 20]);
      expect(total()).toEqual({ sum: 30, count: 2 });

      items([10, 20, 15]);
      expect(total()).toEqual({ sum: 45, count: 3 });

      // Same reference: no recomputation
      const same = items();
      items(same);
      expect(total()).toEqual({ sum: 45, count: 3 });
    });

    test("errors in computed recover dependency tracking on re-execution", () => {
      const data = signal(10);
      const shouldThrow = signal(true);

      // Error thrown before reading dependency: tracking missed on first run
      const badComputed = computed(() => {
        if (shouldThrow()) throw new Error("fail");
        return data() * 2;
      });

      // First read throws
      expect(() => badComputed()).toThrow("fail");

      // Re-execution after switching shouldThrow reads data and rebuilds tracking
      shouldThrow(false);
      expect(badComputed()).toBe(20);

      // Tracking now works: changing data updates the computed
      data(5);
      expect(badComputed()).toBe(10);
    });

    test("try/catch in computed preserves dependency tracking", () => {
      const data = signal(10);
      const shouldThrow = signal(true);

      const safeComputed = computed(() => {
        const throwFlag = shouldThrow();
        const value = data();
        if (throwFlag) return -1;
        return value * 2;
      });

      // Reads both signals before branching: tracking is correct
      expect(safeComputed()).toBe(-1);

      shouldThrow(false);
      expect(safeComputed()).toBe(20);

      data(5);
      expect(safeComputed()).toBe(10);
    });

    test("computed auto-GC removes dependencies when all subscribers removed", () => {
      const a = signal(1);
      const b = computed(() => a() * 10);

      const runs = mock(() => { b(); });
      const cleanup = effect(runs);
      expect(runs).toHaveBeenCalledTimes(1);
      expect(b()).toBe(10);

      // Disposing the only subscriber should trigger computed auto-GC
      cleanup();
      a(2);
      // Computed was GC'd: accessing it recalculates from scratch
      expect(b()).toBe(20);
    });

    test("deeply nested computed chains validate staleness at depth", () => {
      // a -> b -> c -> d -> e -> f (6 levels)
      const a = signal(1);
      const b = computed(() => a() + 1);
      const c = computed(() => b() * 2);
      const d = computed(() => c() + 10);
      const e = computed(() => d() - 5);
      const f = computed(() => e() * 3);

      expect(f()).toBe(27); // ((1+1)*2+10-5)*3 = 27

      a(2);
      expect(f()).toBe(33); // ((2+1)*2+10-5)*3 = 33

      // Same value: skip-update propagates correctly
      a(2);
      expect(f()).toBe(33);
    });

    test("computed auto-GC re-subscription rebuilds dependency graph", () => {
      const a = signal(1);
      const b = computed(() => a() * 10);

      // Subscribe, verify, dispose
      const runs = mock(() => { b(); });
      const cleanup1 = effect(runs);
      expect(runs).toHaveBeenCalledTimes(1);
      a(2);
      expect(runs).toHaveBeenCalledTimes(2);
      expect(b()).toBe(20);
      cleanup1();

      // Computed was GC'd (no subscribers)
      a(3);

      // Re-subscribe: dependency graph rebuilds from scratch
      const runs2 = mock(() => { b(); });
      const cleanup2 = effect(runs2);
      expect(runs2).toHaveBeenCalledTimes(1);
      expect(b()).toBe(30);

      // Updates propagate through rebuilt graph
      a(4);
      expect(runs2).toHaveBeenCalledTimes(2);
      expect(b()).toBe(40);

      cleanup2();
    });

    test("computed auto-GC releases every dependency for multi-dependency computeds", () => {
      const a = signal(1);
      const b = signal(2);

      // The canary must flow into the returned value: a bare `held;` statement optimizes
      // out of the closure and the probe reports a false negative
      const canary = (() => {
        const held = { tag: "multi-dep" };
        const sum = computed(() => ({ total: a() + b(), tag: held }));
        const stop = effect(() => { sum(); });
        stop(); // sum loses its only subscriber: auto-GC must drop both a and b links
        return new WeakRef(held);
      })();

      // Repeated full GCs: a single pass can leave weak targets un-swept
      Bun.gc(true);
      Bun.gc(true);
      Bun.gc(true);
      expect(canary.deref()).toBeUndefined();
    });

    test("computed auto-GC cascades dependency release into inner computeds", () => {
      const a = signal(1);
      const b = signal(2);

      // a ─┐
      //    ├─ inner ─ outer ─ effect
      // b ─┘
      // The canary rides inner's cached value, so it stays retained unless outer's
      // auto-GC cascades through inner and releases both of inner's dependencies
      const canary = (() => {
        const held = { tag: "inner" };
        const inner = computed(() => ({ total: a() + b(), tag: held }));
        const outer = computed(() => inner().total + 1);
        const stop = effect(() => { outer(); });
        stop();
        return new WeakRef(held);
      })();

      Bun.gc(true);
      Bun.gc(true);
      Bun.gc(true);
      expect(canary.deref()).toBeUndefined();
    });

    test("computed re-subscription after multi-dependency auto-GC rebuilds and tracks correctly", () => {
      const a = signal(1);
      const b = signal(2);
      const sum = computed(() => a() + b());

      const runs = mock(() => { sum(); });
      const stop1 = effect(runs);
      expect(runs).toHaveBeenCalledTimes(1);
      expect(sum()).toBe(3);

      stop1();
      a(10);
      b(20);

      // Re-subscribe after the graph was torn down and both sources changed
      const runs2 = mock(() => { sum(); });
      const stop2 = effect(runs2);
      expect(runs2).toHaveBeenCalledTimes(1);
      expect(sum()).toBe(30);

      a(100);
      expect(runs2).toHaveBeenCalledTimes(2);
      expect(sum()).toBe(120);

      b(200);
      expect(runs2).toHaveBeenCalledTimes(3);
      expect(sum()).toBe(300);

      stop2();
    });

    test("computed returning undefined detects no change", () => {
      const toggle = signal(true);
      const c = computed(() => toggle() ? undefined : "value");

      expect(c()).toBe(undefined);

      // Same result: no recomputation needed
      toggle(true);
      expect(c()).toBe(undefined);

      toggle(false);
      expect(c()).toBe("value");

      toggle(true);
      expect(c()).toBe(undefined);
    });

    test("computed returning NaN detects no change", () => {
      const src = signal(0);
      const c = computed(() => src() % 2 === 0 ? NaN : 1);

      const runs = mock(() => { c(); });
      effect(runs);
      expect(runs).toHaveBeenCalledTimes(1);

      src(2); // Recomputes to NaN: self-equal under the default, effect not re-run
      expect(runs).toHaveBeenCalledTimes(1);
      expect(Number.isNaN(c())).toBe(true);

      src(3); // Recomputes to 1: propagates
      expect(runs).toHaveBeenCalledTimes(2);
      expect(c()).toBe(1);

      src(5); // Recomputes to 1: unchanged
      expect(runs).toHaveBeenCalledTimes(2);
    });
  });

  describe("computed equality option", () => {
    test("equals returning true keeps the old reference and skips downstream effects", () => {
      const items = signal([1, 2, 3]);
      const doubled = computed(() => items().map(x => x * 2), {
        equals: (a, b) => a.length === b.length && a.every((v, i) => v === b[i])
      });

      const runs = mock(() => { doubled(); });
      effect(runs);
      expect(runs).toHaveBeenCalledTimes(1);

      const before = doubled();
      items([1, 2, 3]); // New array reference, same content: recomputes to an equal result
      expect(runs).toHaveBeenCalledTimes(1); // Downstream not re-run
      expect(doubled()).toBe(before); // Old cached reference retained
    });

    test("equals returning false propagates to subscribers", () => {
      const items = signal([1, 2, 3]);
      const doubled = computed(() => items().map(x => x * 2), {
        equals: (a, b) => a.length === b.length && a.every((v, i) => v === b[i])
      });

      const runs = mock(() => { doubled(); });
      effect(runs);

      items([4]); // Content-different: propagates
      expect(runs).toHaveBeenCalledTimes(2);
      expect(doubled()).toEqual([8]);
    });

    test("non-function equals throws a validation error", () => {
      expect(() => computed(() => 1, { equals: "nope" as unknown as (a: number, b: number) => boolean }))
        .toThrow("[core] computed: equals must be a function, received string");
    });
  });
});
