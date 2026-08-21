import { describe, expect, test, mock } from "bun:test";
import { batch, computed, effect, scope, signal } from "@hellajs/core";

describe("core", () => {
  describe("scope", () => {
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

    test("empty scopes return a shared no-op cleanup", () => {
      expect(scope(() => { })).toBe(scope(() => { }));
    });
  });
});
