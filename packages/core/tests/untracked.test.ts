import { describe, expect, test, mock } from "bun:test";
import { computed, effect, signal, untracked } from "@hellajs/core";

describe("core", () => {
  describe("untracked", () => {
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

    test("untracked nests inside untracked without leaking tracking", () => {
      const s = signal(0);
      const t = signal(0);

      const runs = mock(() => {
        t();
        untracked(() => {
          untracked(() => s());
        });
      });
      effect(runs);

      expect(runs).toHaveBeenCalledTimes(1);

      s(100); // Inner untracked read never tracked
      expect(runs).toHaveBeenCalledTimes(1);

      t(100); // Tracked read re-runs
      expect(runs).toHaveBeenCalledTimes(2);
    });

    test("untracked inside computed reads multiple signals without tracking them", () => {
      const a = signal(1);
      const b = signal(2);

      const sum = computed(() => untracked(() => a() + b()));

      expect(sum()).toBe(3); // First evaluation reads a and b without linking

      a(10);
      b(20);

      // No dependencies were ever recorded: nothing marks the computed stale,
      // so the cached value stands
      expect(sum()).toBe(3);
    });
  });
});
