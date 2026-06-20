import { describe, expect, test, mock } from "bun:test";

describe("core", () => {
  describe("reactivity", () => {
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

      const effectRuns = mock(() => { obj(); arr(); });
      effect(effectRuns);

      expect(effectRuns).toHaveBeenCalledTimes(1);

      // New object instances trigger updates (reference equality)
      obj({ a: 1, b: 2 });
      expect(effectRuns).toHaveBeenCalledTimes(2);

      arr([1, 2, 3]);
      expect(effectRuns).toHaveBeenCalledTimes(3);

      // Same reference - no update
      const currentObj = obj();
      obj(currentObj);
      expect(effectRuns).toHaveBeenCalledTimes(3);

      const currentArr = arr();
      arr(currentArr);
      expect(effectRuns).toHaveBeenCalledTimes(3);
    });

    test("primitives use value equality", () => {
      const num = signal(42);
      const str = signal("hello");
      const bool = signal(false);

      const effectRuns = mock(() => { num(); str(); bool(); });
      effect(effectRuns);

      expect(effectRuns).toHaveBeenCalledTimes(1);

      // Same primitive values - no update
      num(42);
      str("hello");
      bool(false);
      expect(effectRuns).toHaveBeenCalledTimes(1);

      // Different values - updates
      num(100);
      expect(effectRuns).toHaveBeenCalledTimes(2);

      str("world");
      expect(effectRuns).toHaveBeenCalledTimes(3);

      bool(true);
      expect(effectRuns).toHaveBeenCalledTimes(4);
    });

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

    test("effects run on changes with cleanup and nested support", () => {
      const count = signal(0);
      const trigger = signal(0);
      let lastValue = 0;

      // Basic effect with cleanup
      const effectRuns = mock(() => { lastValue = count(); });
      const cleanup = effect(effectRuns);

      expect(effectRuns).toHaveBeenCalledTimes(1);
      expect(lastValue).toBe(0);

      count(5);
      expect(effectRuns).toHaveBeenCalledTimes(2);
      expect(lastValue).toBe(5);

      // Cleanup stops tracking
      cleanup();
      count(10);
      expect(effectRuns).toHaveBeenCalledTimes(2);

      // Nested effects
      const nestedRuns = mock(() => { });
      effect(() => {
        trigger();
        effect(nestedRuns);
      });

      expect(nestedRuns).toHaveBeenCalledTimes(1);
      trigger(1);
      expect(nestedRuns).toHaveBeenCalledTimes(2);
    });

    test("batch groups updates and untracked prevents dependencies", () => {
      const a = signal(0);
      const b = signal(0);
      const untrackedSig = signal(0);

      // Batch test
      const batchEffectRuns = mock(() => { a(); b(); });
      effect(batchEffectRuns);

      expect(batchEffectRuns).toHaveBeenCalledTimes(1);

      // Without batch: 2 runs
      a(1);
      b(2);
      expect(batchEffectRuns).toHaveBeenCalledTimes(3);

      // With batch: 1 run
      batch(() => {
        a(10);
        b(20);
      });
      expect(batchEffectRuns).toHaveBeenCalledTimes(4);

      // Untracked prevents dependencies
      const untrackedEffectRuns = mock(() => {
        a();
        untracked(() => untrackedSig());
      });
      effect(untrackedEffectRuns);

      expect(untrackedEffectRuns).toHaveBeenCalledTimes(1);
      a(100);
      expect(untrackedEffectRuns).toHaveBeenCalledTimes(2);
      untrackedSig(999);
      expect(untrackedEffectRuns).toHaveBeenCalledTimes(2); // No rerun
    });

    test("scope collects and disposes effects", () => {
      const count = signal(0);

      // Unscoped effect for comparison
      const unscopedRuns = mock(() => { count(); });
      const cleanupUnscoped = effect(unscopedRuns);

      // Scoped effects
      const scopedRuns = mock(() => { count(); });
      const dispose = scope(() => {
        effect(scopedRuns);
        effect(scopedRuns);
      });

      expect(scopedRuns).toHaveBeenCalledTimes(2);
      expect(unscopedRuns).toHaveBeenCalledTimes(1);

      count(1);
      expect(scopedRuns).toHaveBeenCalledTimes(4);
      expect(unscopedRuns).toHaveBeenCalledTimes(2);

      // Dispose scope - unscoped continues
      dispose();
      count(2);
      expect(scopedRuns).toHaveBeenCalledTimes(4);
      expect(unscopedRuns).toHaveBeenCalledTimes(3);

      // Multiple dispose calls safe
      expect(() => dispose()).not.toThrow();

      // Empty scopes return shared noop
      expect(scope(() => { })).toBe(scope(() => { }));

      cleanupUnscoped();
    });

    test("nested scopes dispose independently", () => {
      const count = signal(0);

      const outerRuns = mock(() => { count(); });
      const innerRuns = mock(() => { count(); });

      const disposeOuter = scope(() => {
        effect(outerRuns);

        const disposeInner = scope(() => {
          effect(innerRuns);
        });

        count(1);
        expect(outerRuns).toHaveBeenCalledTimes(2);
        expect(innerRuns).toHaveBeenCalledTimes(2);

        disposeInner();
        count(2);
        expect(outerRuns).toHaveBeenCalledTimes(3);
        expect(innerRuns).toHaveBeenCalledTimes(2);
      });

      disposeOuter();
      count(3);
      expect(outerRuns).toHaveBeenCalledTimes(3);
    });

    test("scope works with batch and computed", () => {
      const a = signal(0);
      const b = signal(0);

      const runs = mock(() => { sum(); });
      const sum = computed(() => a() + b());
      const dispose = scope(() => {
        effect(runs);
      });

      expect(runs).toHaveBeenCalledTimes(1);

      batch(() => { a(5); b(10); });
      expect(runs).toHaveBeenCalledTimes(2);

      dispose();
      batch(() => { a(100); b(200); });
      expect(runs).toHaveBeenCalledTimes(2);
    });

    test("signal without initial value returns undefined", () => {
      const s = signal<string>();
      expect(s()).toBeUndefined();
      s("hello");
      expect(s()).toBe("hello");
      s(undefined);
      expect(s()).toBeUndefined();
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

    test("errors in effect are thrown from signal setter", () => {
      const count = signal(0);

      const cleanupBad = effect(() => {
        if (count() > 1) throw new Error("effect error");
      });

      // Effect throws when count exceeds threshold
      expect(() => count(2)).toThrow("effect error");

      // Error doesn't corrupt signal state
      expect(count()).toBe(2);

      // After cleanup, no more throws
      cleanupBad();
      expect(() => count(5)).not.toThrow();
      expect(count()).toBe(5);
    });

    test("try/catch in effect preserves dependency tracking", () => {
      const data = signal(10);
      const shouldThrow = signal(true);
      let effectValue = 0;

      effect(() => {
        const throwFlag = shouldThrow();
        const value = data();
        try {
          if (throwFlag) throw new Error("effect fail");
          effectValue = value;
        } catch {
          effectValue = -1;
        }
      });

      expect(effectValue).toBe(-1);

      shouldThrow(false);
      expect(effectValue).toBe(10);

      data(25);
      expect(effectValue).toBe(25);
    });

    test("nested batch defers effects to outermost batch", () => {
      const a = signal(0);
      const b = signal(0);

      const runs = mock(() => { a(); b(); });
      effect(runs);
      expect(runs).toHaveBeenCalledTimes(1);

      batch(() => {
        a(1);
        batch(() => { a(2); b(3); });
        b(4);
      });

      // Only one effect run after outermost batch completes
      expect(runs).toHaveBeenCalledTimes(2);
      expect(a()).toBe(2);
      expect(b()).toBe(4);
    });

    test("async operations in effects work via then chains", async () => {
      const id = signal(1);
      const result = signal<string>("init");

      effect(() => {
        const currentId = id();
        Promise.resolve(`data-${currentId}`).then(data => {
          result(data);
        });
      });

      expect(result()).toBe("init");

      await tick();
      expect(result()).toBe("data-1");

      id(2);
      await tick();
      expect(result()).toBe("data-2");
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

    test("batch returns the callback result", () => {
      const a = signal(1);
      const b = signal(2);

      const sum = batch(() => {
        a(10);
        b(20);
        return a() + b();
      });

      expect(sum).toBe(30);
    });

    test("effect not double-queued when scheduled twice in same propagation", () => {
      const a = signal(0);
      const b = signal(0);

      const runs = mock(() => { a(); b(); });
      effect(runs);
      expect(runs).toHaveBeenCalledTimes(1);

      // Both signals change: effect should run exactly once per flush
      batch(() => {
        a(1);
        b(1);
      });

      expect(runs).toHaveBeenCalledTimes(2);
    });

    test("effect error recovery preserves dependency graph", () => {
      const data = signal(10);
      const shouldThrow = signal(false);
      let effectValue = 0;

      const cleanup = effect(() => {
        const value = data();
        if (shouldThrow()) throw new Error("boom");
        effectValue = value;
      });

      expect(effectValue).toBe(10);

      // shouldThrow change triggers effect re-run, which throws
      expect(() => shouldThrow(true)).toThrow("boom");

      // Signal state unaffected by the error
      expect(data()).toBe(10);

      // Recover: setting shouldThrow to false triggers effect without error
      shouldThrow(false);
      expect(effectValue).toBe(10);

      // After recovery, effect still tracks data
      data(30);
      expect(effectValue).toBe(30);

      cleanup();
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

    test("deeply nested effects accumulate without explicit cleanup", () => {
      const a = signal(1);
      const b = signal(10);
      const c = signal(100);
      const level3Count = mock(() => { c(); });

      effect(() => {
        a();
        effect(() => {
          b();
          effect(level3Count);
        });
      });

      expect(level3Count).toHaveBeenCalledTimes(1);

      // a change re-runs parent, creating new nested effects (old ones persist)
      a(2);
      expect(level3Count).toHaveBeenCalledTimes(2); // new L3 created, old L3 not triggered (c unchanged)

      // c change triggers ALL L3 instances (old + new)
      c(200);
      expect(level3Count).toHaveBeenCalledTimes(4); // 2 existing L3 effects each run
    });

    test("effect cleanup return value runs on re-execution and disposal", () => {
      const count = signal(0);
      const cleanupRuns = mock(() => { });

      const cleanup = effect(() => {
        count();
        return cleanupRuns;
      });

      // Re-execution triggers cleanup
      count(1);
      expect(cleanupRuns).toHaveBeenCalledTimes(1);

      // Disposal triggers cleanup
      cleanup();
      expect(cleanupRuns).toHaveBeenCalledTimes(2);
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

    test("effect error during flush stops queue processing", () => {
      const a = signal(0);
      const b = signal(0);
      let effectARan = false;
      let effectBRan;

      // Schedule both effects
      effect(() => { a(); effectARan = true; });
      const cleanupBad = effect(() => {
        if (a() > 0) throw new Error("flush error");
        a();
      });
      effect(() => { b(); effectBRan = true; });

      effectBRan = false;

      expect(effectARan).toBe(true);
      expect(effectBRan).toBe(false);
      // Error from throwing effect aborts flush: remaining queue not processed
      expect(() => a(1)).toThrow("flush error");
      expect(effectBRan).toBe(false);

      // After cleanup, subsequent updates process normally
      cleanupBad();
      b(1);
      expect(effectBRan).toBe(true);
    });

    test("scope double-cleanup keeps effects disposed", () => {
      const count = signal(0);

      const runs = mock(() => { count(); });
      const dispose = scope(() => {
        effect(runs);
      });

      expect(runs).toHaveBeenCalledTimes(1);
      count(1);
      expect(runs).toHaveBeenCalledTimes(2);

      dispose();
      count(2);
      expect(runs).toHaveBeenCalledTimes(2);

      // Second cleanup is safe but effects stay disposed
      dispose();
      count(3);
      expect(runs).toHaveBeenCalledTimes(2);
    });
  });
});
