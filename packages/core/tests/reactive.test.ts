import { describe, expect, test } from 'bun:test';

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
    expect(scope(() => {})).toBe(scope(() => {}));

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
});
