import { describe, expect, test, mock } from "bun:test";
import { batch, effect, signal } from "@hellajs/core";
import { delay } from "@utils/test-helpers.js";

describe("core", () => {
  describe("effects", () => {
    test("effects re-run on changes and stop after cleanup", () => {
      const count = signal(0);
      let lastValue = 0;

      // Basic effect with cleanup
      const runs = mock(() => { lastValue = count(); });
      const cleanup = effect(runs);

      expect(runs).toHaveBeenCalledTimes(1);
      expect(lastValue).toBe(0);

      count(5);
      expect(runs).toHaveBeenCalledTimes(2);
      expect(lastValue).toBe(5);

      // Cleanup stops tracking
      cleanup();
      count(10);
      expect(runs).toHaveBeenCalledTimes(2);
    });

    test("nested effects created during a parent re-run execute immediately", () => {
      const trigger = signal(0);
      const nestedRuns = mock(() => { });
      effect(() => {
        trigger();
        effect(nestedRuns);
      });

      expect(nestedRuns).toHaveBeenCalledTimes(1);
      trigger(1);
      expect(nestedRuns).toHaveBeenCalledTimes(2);
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

      await delay();
      expect(result()).toBe("data-1");

      id(2);
      await delay();
      expect(result()).toBe("data-2");
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

    test("effect error during flush stops queue processing", () => {
      const a = signal(0);
      const b = signal(0);
      const effectAMock = mock(() => { a(); });
      const effectBMock = mock(() => { b(); });

      // Schedule both effects
      effect(effectAMock);
      const cleanupBad = effect(() => {
        if (a() > 0) throw new Error("flush error");
        a();
      });
      effect(effectBMock);

      effectBMock.mockClear();

      expect(effectAMock).toHaveBeenCalled();
      expect(effectBMock).not.toHaveBeenCalled();
      // Error from throwing effect aborts flush: remaining queue not processed
      expect(() => a(1)).toThrow("flush error");
      expect(effectBMock).not.toHaveBeenCalled();

      // After cleanup, subsequent updates process normally
      cleanupBad();
      b(1);
      expect(effectBMock).toHaveBeenCalled();
    });
  });
});
