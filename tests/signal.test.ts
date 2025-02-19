import { describe, test, expect, beforeEach, mock } from "bun:test";
import { signal, computed, effect, batchSignals, immutable } from "../lib";
import { HELLA_REACTIVE } from "../lib/reactive/reactive.global";
import { maxSubscribersLimit } from "../lib/reactive/reactive.security";
import { tick } from "./utils";

describe("Reactive Primitives", () => {
  beforeEach(() => {
    // Reset global state
    HELLA_REACTIVE.batchingSignals = false;
    HELLA_REACTIVE.activeEffects = [];
    HELLA_REACTIVE.pendingEffects.clear();
  });

  describe("Signal", () => {
    test("basic get/set operations", () => {
      const count = signal(0);
      expect(count()).toBe(0);

      count.set(1);
      expect(count()).toBe(1);
    });

    test("signal lifecycle hooks", () => {
      const onRead = mock(() => {});
      const onWrite = mock(() => {});
      const onSubscribe = mock(() => {});
      const onUnsubscribe = mock(() => {});
      const onDispose = mock(() => {});

      const count = signal(0, {
        onRead,
        onWrite,
        onSubscribe,
        onUnsubscribe,
        onDispose,
      });

      count(); // read
      expect(onRead).toHaveBeenCalledTimes(1);

      count.set(1); // write
      expect(onWrite).toHaveBeenCalledWith(0, 1);

      const unsub = count.subscribe(() => {});
      expect(onSubscribe).toHaveBeenCalled();

      unsub();
      expect(onUnsubscribe).toHaveBeenCalled();

      count.dispose();
      expect(onDispose).toHaveBeenCalled();
    });

    test("signal validation and sanitization", () => {
      const validate = (n: number) => n >= 0;
      const sanitize = (n: number) => Math.max(0, n);

      // Test initial validation
      const count = signal(0, { validate, sanitize });
      expect(count()).toBe(0); // 0 is valid

      // Test sanitization
      count.set(-1); // Should be sanitized to 0
      expect(count()).toBe(0);

      // Test validation without sanitization
      expect(() => {
        signal(-1, { validate }); // No sanitize function
      }).toThrow("Signal value validation failed");
    });

    test("subscriber limit", () => {
      const count = signal(0);
      const limit = maxSubscribersLimit();

      // Add subscribers up to limit
      const subs = Array(limit + 1)
        .fill(null)
        .map(() => count.subscribe(() => {}));

      // Attempt to exceed limit
      expect(() => {
        count.subscribe(() => {}); // No sanitize function
      }).toThrow("Maximum subscriber limit (1000) exceeded");

      // Cleanup
      subs.forEach((unsub) => unsub());
    });
  });

  describe("Computed", () => {
    test("basic computation", async () => {
      const count = signal(0);
      const double = computed(() => count() * 2);

      expect(double()).toBe(0);
      count.set(2);
      await tick();
      expect(double()).toBe(4);
    });

    test("computed with multiple dependencies", async () => {
      const x = signal(1);
      const y = signal(2);
      const sum = computed(() => x() + y());

      expect(sum()).toBe(3);

      x.set(2);
      await tick();
      expect(sum()).toBe(4);

      y.set(3);
      await tick();
      expect(sum()).toBe(5);
    });

    test("computed lifecycle hooks", async () => {
      const onCreate = mock(() => {});
      const onCompute = mock(() => {});

      const count = signal(0);
      const double = computed(() => count() * 2, {
        onCreate,
        onCompute,
      });

      count.set(1);
      await tick();
      expect(double()).toBe(2);
      expect(onCreate).toHaveBeenCalled();

      count.set(2);
      await tick();
      ``;
      expect(onCompute).toHaveBeenCalled();
    });

    test("nested computed values", async () => {
      const count = signal(0);
      const double = computed(() => count() * 2);
      const quadruple = computed(() => double() * 2);

      expect(quadruple()).toBe(0);

      count.set(1);
      await tick();
      expect(quadruple()).toBe(4);
    });

    // test("computed dependency limit", () => {
    //   const signals = Array(101)
    //     .fill(null)
    //     .map(() => signal(0));

    //   expect(() => {
    //     computed(() => signals.reduce((sum, s) => sum + s(), 0));
    //   }).toThrow("Computed dependencies limit exceeded");
    // });
  });

  describe("Effect", () => {
    test("basic effect execution", async () => {
      const count = signal(0);
      const spy = mock((_: number) => {});

      effect(() => spy(count()));

      await tick();
      expect(spy).toHaveBeenCalledWith(0);

      count.set(1);
      await tick();
      expect(spy).toHaveBeenCalledWith(1);
    });

    // test("effect cleanup", async () => {
    //   const count = signal(0);
    //   const cleanup = mock(() => {});

    //   effect(() => {
    //     count(); // track dependency
    //     return cleanup;
    //   });

    //   count.set(1); // trigger effect & cleanup
    //   await tick();
    //   expect(cleanup).toHaveBeenCalled();
    // });

    test("nested effects", async () => {
      const count = signal(0);
      const outer = mock((_: number) => {});
      const inner = mock((_: number) => {});

      effect(() => {
        outer(count());
        effect(() => {
          inner(count());
        });
      });

      count.set(1);
      await tick();
      expect(outer).toHaveBeenCalledWith(1);
      expect(inner).toHaveBeenCalledWith(1);
    });
  });

  describe("Batch Updates", () => {
    test("batched signal updates", async () => {
      const count = signal(0);
      const spy = mock((_: number) => {});

      effect(() => spy(count()));

      batchSignals(() => {
        count.set(1);
        count.set(2);
        count.set(3);
      });

      await tick();
      // Effect should only run once with final value
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenLastCalledWith(3);
    });
  });

  describe("Immutable Signal", () => {
    const fixed = immutable({ value: 1 });

    test("immutable signal creation", () => {
      expect(fixed().value).toEqual(1);
    });

    test("immutable signal protection", () => {
      fixed().value = 2;
      expect(fixed().value).toEqual(1);
    });
  });

  describe("Memory Management", () => {
    test("signal disposal", async () => {
      const count = signal(0);
      const spy = mock(() => {});

      const unsub = count.subscribe(spy);
      count.set(1);
      await tick();
      expect(spy).toHaveBeenCalled();

      count.dispose();
      count.set(2);
      await tick();
      expect(spy).toHaveBeenCalledTimes(1); // No new calls

      expect(() => unsub()).not.toThrow(); // Safe to call after disposal
    });

    // test("effect disposal", async () => {
    //   const count = signal(0);
    //   const spy = mock((_: number) => {});

    //   const dispose = effect(() => {
    //     spy(count());
    //   });

    //   count.set(1);
    //   await tick();
    //   expect(spy).toHaveBeenCalledWith(1);

    //   dispose();
    //   count.set(2);
    //   await tick();
    //   expect(spy).not.toHaveBeenCalledWith(2);
    // });
  });
});
