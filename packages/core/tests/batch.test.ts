import { describe, expect, test, mock } from "bun:test";

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
