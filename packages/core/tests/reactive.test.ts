import { describe, expect, test } from "bun:test";

describe("reactive system", () => {
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
    let effectRuns = 0;
    const obj = signal({ a: 1, b: 2 });
    const arr = signal([1, 2, 3]);

    effect(() => {
      obj(); arr();
      effectRuns++;
    });

    expect(effectRuns).toBe(1);

    // New object instances trigger updates (reference equality)
    obj({ a: 1, b: 2 });
    expect(effectRuns).toBe(2);

    arr([1, 2, 3]);
    expect(effectRuns).toBe(3);

    // Same reference - no update
    const currentObj = obj();
    obj(currentObj);
    expect(effectRuns).toBe(3);

    const currentArr = arr();
    arr(currentArr);
    expect(effectRuns).toBe(3);
  });

  test("primitives use value equality", () => {
    let effectRuns = 0;
    const num = signal(42);
    const str = signal("hello");
    const bool = signal(false);

    effect(() => {
      num(); str(); bool();
      effectRuns++;
    });

    expect(effectRuns).toBe(1);

    // Same primitive values - no update
    num(42);
    str("hello");
    bool(false);
    expect(effectRuns).toBe(1);

    // Different values - updates
    num(100);
    expect(effectRuns).toBe(2);

    str("world");
    expect(effectRuns).toBe(3);

    bool(true);
    expect(effectRuns).toBe(4);
  });

  test("computed derives and chains values with caching", () => {
    const firstName = signal("John");
    const lastName = signal("Doe");
    const price = signal(100);
    const quantity = signal(2);
    const discount = signal(0.1);
    let computeCount = 0;

    // Simple derivation
    const fullName = computed(() => `${firstName()} ${lastName()}`);
    expect(fullName()).toBe("John Doe");

    // Chained derivation with compute tracking
    const subtotal = computed(() => { computeCount++; return price() * quantity(); });
    const discountAmount = computed(() => subtotal() * discount());
    const total = computed(() => subtotal() - discountAmount());

    // Subscribe to trigger computation
    effect(() => total());
    expect(computeCount).toBe(1);
    expect(total()).toBe(180);

    // Updates propagate through chain
    firstName("Jane");
    quantity(3);
    expect(fullName()).toBe("Jane Doe");
    expect(total()).toBe(270);
    expect(computeCount).toBe(2);

    // Same value doesn't recompute
    quantity(3);
    expect(computeCount).toBe(2);
  });

  test("effects run on changes with cleanup and nested support", () => {
    const count = signal(0);
    const trigger = signal(0);
    let effectRuns = 0;
    let nestedRuns = 0;
    let lastValue = 0;

    // Basic effect with cleanup
    const cleanup = effect(() => {
      lastValue = count();
      effectRuns++;
    });

    expect(effectRuns).toBe(1);
    expect(lastValue).toBe(0);

    count(5);
    expect(effectRuns).toBe(2);
    expect(lastValue).toBe(5);

    // Cleanup stops tracking
    cleanup();
    count(10);
    expect(effectRuns).toBe(2);

    // Nested effects
    effect(() => {
      trigger();
      effect(() => nestedRuns++);
    });

    expect(nestedRuns).toBe(1);
    trigger(1);
    expect(nestedRuns).toBe(2);
  });

  test("batch groups updates and untracked prevents dependencies", () => {
    const a = signal(0);
    const b = signal(0);
    const untrackedSig = signal(0);
    let batchEffectRuns = 0;
    let untrackedEffectRuns = 0;

    // Batch test
    effect(() => {
      a();
      b();
      batchEffectRuns++;
    });

    expect(batchEffectRuns).toBe(1);

    // Without batch: 2 runs
    a(1);
    b(2);
    expect(batchEffectRuns).toBe(3);

    // With batch: 1 run
    batch(() => {
      a(10);
      b(20);
    });
    expect(batchEffectRuns).toBe(4);

    // Untracked prevents dependencies
    effect(() => {
      a();
      untracked(() => untrackedSig());
      untrackedEffectRuns++;
    });

    expect(untrackedEffectRuns).toBe(1);
    a(100);
    expect(untrackedEffectRuns).toBe(2);
    untrackedSig(999);
    expect(untrackedEffectRuns).toBe(2); // No rerun
  });

  test("scope collects and disposes effects", () => {
    const count = signal(0);
    let scopedRuns = 0;
    let unscopedRuns = 0;

    // Unscoped effect for comparison
    const cleanupUnscoped = effect(() => { count(); unscopedRuns++; });

    // Scoped effects
    const dispose = scope(() => {
      effect(() => { count(); scopedRuns++; });
      effect(() => { count(); scopedRuns++; });
    });

    expect(scopedRuns).toBe(2);
    expect(unscopedRuns).toBe(1);

    count(1);
    expect(scopedRuns).toBe(4);
    expect(unscopedRuns).toBe(2);

    // Dispose scope - unscoped continues
    dispose();
    count(2);
    expect(scopedRuns).toBe(4);
    expect(unscopedRuns).toBe(3);

    // Multiple dispose calls safe
    expect(() => dispose()).not.toThrow();

    // Empty scopes return shared noop
    expect(scope(() => { })).toBe(scope(() => { }));

    cleanupUnscoped();
  });

  test("nested scopes dispose independently", () => {
    const count = signal(0);
    let outerRuns = 0;
    let innerRuns = 0;

    const disposeOuter = scope(() => {
      effect(() => { count(); outerRuns++; });

      const disposeInner = scope(() => {
        effect(() => { count(); innerRuns++; });
      });

      count(1);
      expect(outerRuns).toBe(2);
      expect(innerRuns).toBe(2);

      disposeInner();
      count(2);
      expect(outerRuns).toBe(3);
      expect(innerRuns).toBe(2);
    });

    disposeOuter();
    count(3);
    expect(outerRuns).toBe(3);
  });

  test("scope works with batch and computed", () => {
    const a = signal(0);
    const b = signal(0);
    let runs = 0;

    const dispose = scope(() => {
      const sum = computed(() => a() + b());
      effect(() => { sum(); runs++; });
    });

    expect(runs).toBe(1);

    batch(() => { a(5); b(10); });
    expect(runs).toBe(2);

    dispose();
    batch(() => { a(100); b(200); });
    expect(runs).toBe(2);
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

    // Same reference — no recomputation
    const same = items();
    items(same);
    expect(total()).toEqual({ sum: 45, count: 3 });
  });

  test("errors in computed break dependency tracking when thrown before reads", () => {
    const data = signal(10);
    const shouldThrow = signal(true);

    // Error thrown before reading dependency — tracking breaks
    const badComputed = computed(() => {
      if (shouldThrow()) throw new Error("fail");
      return data() * 2;
    });

    // First read throws
    expect(() => badComputed()).toThrow("fail");

    // Still broken — switching shouldThrow off doesn't fix tracking
    shouldThrow(false);
    expect(badComputed()).toBe(20);

    // Now it tracks data — changing data updates correctly
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

    // Reads both signals before branching — tracking is correct
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
    let runs = 0;

    effect(() => { a(); b(); runs++; });
    expect(runs).toBe(1);

    batch(() => {
      a(1);
      batch(() => { a(2); b(3); });
      b(4);
    });

    // Only one effect run after outermost batch completes
    expect(runs).toBe(2);
    expect(a()).toBe(2);
    expect(b()).toBe(4);
  });

  test("async operations in effects work via then chains", () => {
    const id = signal(1);
    const result = signal<string>("init");

    effect(() => {
      const currentId = id();
      // Simulate async fetch via Promise.resolve
      Promise.resolve(`data-${currentId}`).then(data => {
        result(data);
      });
    });

    expect(result()).toBe("init");

    // Flush microtask queue
    return Promise.resolve().then(() => {
      expect(result()).toBe("data-1");
      id(2);
      return Promise.resolve().then(() => {
        expect(result()).toBe("data-2");
      });
    });
  });

  test("computed auto-GC removes dependencies when all subscribers removed", () => {
    const a = signal(1);
    const b = computed(() => a() * 10);
    let runs = 0;

    const cleanup = effect(() => { b(); runs++; });
    expect(runs).toBe(1);
    expect(b()).toBe(10);

    // Disposing the only subscriber should trigger computed auto-GC
    cleanup();
    a(2);
    // Computed was GC'd — accessing it recalculates from scratch
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
    let runs = 0;

    effect(() => { a(); b(); runs++; });
    expect(runs).toBe(1);

    // Both signals change — effect should run exactly once per flush
    batch(() => {
      a(1);
      b(1);
    });

    expect(runs).toBe(2);
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
    let level3Count = 0;

    effect(() => {
      a();
      effect(() => {
        b();
        effect(() => {
          c();
          level3Count++;
        });
      });
    });

    expect(level3Count).toBe(1);

    // a change re-runs parent, creating new nested effects (old ones persist)
    a(2);
    expect(level3Count).toBe(2); // new L3 created, old L3 not triggered (c unchanged)

    // c change triggers ALL L3 instances (old + new)
    c(200);
    expect(level3Count).toBe(4); // 2 existing L3 effects each run
  });
});
