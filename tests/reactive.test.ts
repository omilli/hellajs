import { describe, test, expect, beforeEach, mock, Mock } from "bun:test";
import { signal, computed, effect, batchSignals, Signal } from "../lib";
import { HELLA_REACTIVE } from "../lib/reactive/reactive.global";
import { maxSubscribersLimit } from "../lib/reactive/reactive.security";
import { tick } from "./utils";

const fn = () => {};

let count: Signal<number>;
let spy: Mock<(_?: number) => void>;
let onRead: Mock<() => void>;
let onWrite: Mock<() => void>;
let onSubscribe: Mock<() => void>;
let onUnsubscribe: Mock<() => void>;
let onDispose: Mock<() => void>;
const sanitize = (n: number) => parseInt(n.toFixed(0));
const validate = (n: number) => n >= 0;

describe("Reactivity", () => {
  beforeEach(() => {
    spy = mock(fn);
    onRead = mock(fn);
    onWrite = mock(fn);
    onSubscribe = mock(fn);
    onUnsubscribe = mock(fn);
    onDispose = mock(fn);
    count = signal(0, {
      onRead,
      onWrite,
      onSubscribe,
      onUnsubscribe,
      onDispose,
      sanitize,
      validate,
    });

    HELLA_REACTIVE.activeEffects = [];
    HELLA_REACTIVE.pendingEffects.clear();
  });

  describe("Signal", () => {
    test("operations", () => {
      expect(count()).toBe(0);
      count.set(1);
      expect(count()).toBe(1);
    });

    test("hooks", () => {
      count();
      expect(onRead).toHaveBeenCalledTimes(1);

      count.set(1);
      expect(onWrite).toHaveBeenCalledWith(0, 1);

      const unsub = count.subscribe(fn);
      expect(onSubscribe).toHaveBeenCalled();

      unsub();
      expect(onUnsubscribe).toHaveBeenCalled();

      count.dispose();
      expect(onDispose).toHaveBeenCalled();
    });

    test("validation/sanitization", () => {
      expect(() => signal(-1, { validate })).toThrow(
        "Signal value validation failed"
      );
    });

    test("sanitization", () => {
      count.set(0.8);
      expect(count()).toBe(1);
    });

    test("subscriber limit", () => {
      const limit = maxSubscribersLimit();

      // Add subscribers up to limit
      const subs = Array(limit + 1)
        .fill(null)
        .map(() => count.subscribe(() => {}));

      // Attempt to exceed limit
      expect(() => count.subscribe(fn)).toThrow(
        "Maximum subscriber limit (1000) exceeded"
      );

      // Cleanup
      subs.forEach((unsub) => unsub());
    });

    test("disposal", async () => {
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

    test("batched", async () => {
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

  describe("Computed", () => {
    test("computation", async () => {
      const double = computed(() => count() * 2);

      expect(double()).toBe(0);
      count.set(2);
      await tick();
      expect(double()).toBe(4);
    });

    test("dependencies", async () => {
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

    test("hooks", async () => {
      const onCreate = mock(fn);
      const onCompute = mock(fn);

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

    test("nested", async () => {
      const double = computed(() => count() * 2);
      const quadruple = computed(() => double() * 2);

      expect(quadruple()).toBe(0);

      count.set(1);
      await tick();
      expect(quadruple()).toBe(4);
    });
  });

  describe("Effect", () => {
    test("execution", async () => {
      effect(() => spy(count()));

      await tick();
      expect(spy).toHaveBeenCalledWith(0);

      count.set(1);
      await tick();
      expect(spy).toHaveBeenCalledWith(1);
    });

    test("cleanup", async () => {
      const count = signal(0);
      let cleanupRun = false;

      effect(() => {
        count(); // track dependency
        return () => {
          cleanupRun = true;
        };
      });

      count.set(1); // trigger effect & cleanup
      await tick();
      expect(cleanupRun).toBe(true);
    });

    test("nested", async () => {
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

    test("disposal", async () => {
      const spy = mock((_: number) => {});

      const dispose = effect(() => {
        spy(count());
      });

      count.set(1);
      await tick();
      expect(spy).toHaveBeenCalledWith(1);
      dispose();
      count.set(2);
      expect(spy).not.toHaveBeenCalledWith(2);
    });
  });
});
