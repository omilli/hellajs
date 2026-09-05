import { describe, expect, test, mock } from "bun:test";
import { batch, computed, effect, signal, untracked } from "@hellajs/core";

describe("core", () => {
  describe("batch", () => {
    test("batch groups updates to run effects once", () => {
      const a = signal(0);
      const b = signal(0);

      const runs = mock(() => { a(); b(); });
      effect(runs);

      expect(runs).toHaveBeenCalledTimes(1);

      // Without batch: 2 runs
      a(1);
      b(2);
      expect(runs).toHaveBeenCalledTimes(3);

      // With batch: 1 run
      batch(() => {
        a(10);
        b(20);
      });
      expect(runs).toHaveBeenCalledTimes(4);
    });

    test("batched writes that cancel out still run signal-only effects once", () => {
      const a = signal(0);

      const runs = mock(() => { a(); });
      effect(runs);
      runs.mockClear();

      // Signal writes prove change at write time, so signal-only effects run without
      // flush-time stale validation — a canceling batch costs one extra run
      batch(() => {
        a(1);
        a(0);
      });
      expect(runs).toHaveBeenCalledTimes(1);
      expect(a()).toBe(0);
    });

    test("batched writes that cancel out skip computed-mediated effects", () => {
      const a = signal(0);
      const value = computed(() => a() + 1);

      const runs = mock(() => { value(); });
      effect(runs);
      runs.mockClear();

      batch(() => {
        a(1);
        a(0);
      });
      expect(runs).not.toHaveBeenCalled();
      expect(value()).toBe(1);
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

    test("untracked prevents dependency tracking in effects", () => {
      const a = signal(0);
      const untrackedSig = signal(0);

      const runs = mock(() => {
        a();
        untracked(() => untrackedSig());
      });
      effect(runs);

      expect(runs).toHaveBeenCalledTimes(1);
      a(100);
      expect(runs).toHaveBeenCalledTimes(2);
      untrackedSig(999);
      expect(runs).toHaveBeenCalledTimes(2); // No rerun
    });
  });
});
