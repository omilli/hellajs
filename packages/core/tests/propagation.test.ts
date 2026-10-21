import { describe, test, expect, vi } from "vite-plus/test";
import { batch, computed, effect, signal } from "@hellajs/core";

describe("core", () => {
  describe("propagation", () => {
    test("effect writing a signal it reads stabilizes without looping", () => {
      const count = signal(0);
      const runs = vi.fn(() => {
        count(count() + 1);
      });
      effect(runs);

      // The self-write lands mid-run: propagation sees the executing effect and
      // defers instead of queueing it, so the first run is the only eager one
      expect(runs).toHaveBeenCalledTimes(1);
      expect(count()).toBe(1);

      // The deferred state re-arms on the next external write and the effect's own
      // write still commits
      count(9);
      expect(runs).toHaveBeenCalledTimes(2);
      expect(count()).toBe(10);
    });

    test("reading the same signal twice in one effect keeps a single subscription", () => {
      const first = signal(1);
      const second = signal(10);
      const runs = vi.fn(() => {
        first();
        second();
        first();
      });
      effect(runs);
      expect(runs).toHaveBeenCalledTimes(1);

      first(2);
      expect(runs).toHaveBeenCalledTimes(2);
      second(20);
      expect(runs).toHaveBeenCalledTimes(3);
      first(3);
      expect(runs).toHaveBeenCalledTimes(4);
    });

    test("clean validation unwinds through a computed and continues to sibling dependencies", () => {
      const base = signal(0);
      const offset = signal(100);
      const total = computed(() => base() + offset());
      const extra = signal(1);
      const runs = vi.fn(() => {
        total();
        extra();
      });
      const tailRuns = vi.fn(() => {
        total();
      });
      effect(runs);
      effect(tailRuns);
      expect(runs).toHaveBeenCalledTimes(1);
      expect(tailRuns).toHaveBeenCalledTimes(1);

      // base's write cancels out: validation dives through total, resolves it clean,
      // clears its pending state, and still walks the effect's remaining dependency
      batch(() => {
        base(5);
        base(0);
      });
      expect(runs).toHaveBeenCalledTimes(1);
      expect(tailRuns).toHaveBeenCalledTimes(1);
      expect(total()).toBe(100);

      // A real change through the same chain still propagates to both subscribers
      base(5);
      expect(runs).toHaveBeenCalledTimes(2);
      expect(tailRuns).toHaveBeenCalledTimes(2);
      expect(total()).toBe(105);
    });

    test("effect writing an unread dependency mid-run stays stable", () => {
      const count = signal(0);
      const runs = vi.fn(() => {
        count(99);
        return count();
      });
      effect(runs);

      // The write lands before the read re-links the dependency, so the executing
      // effect is neither queued nor re-marked — the run simply completes
      expect(runs).toHaveBeenCalledTimes(1);
      expect(count()).toBe(99);

      // The next external write queues a normal validated re-run
      count(1);
      expect(runs).toHaveBeenCalledTimes(2);
      expect(count()).toBe(99);
    });

    test("effect writing an already-tracked dependency mid-run defers to the next write", () => {
      const first = signal(1);
      const second = signal(10);
      const runs = vi.fn(() => {
        const current = first();
        second();
        first(current + 1);
      });
      effect(runs);

      // The mid-run write targets a tracked-but-not-last dependency: the recursion
      // check walks the dependency list, defers, and the run completes unchanged
      expect(runs).toHaveBeenCalledTimes(1);
      expect(first()).toBe(2);

      first(50);
      expect(runs).toHaveBeenCalledTimes(2);
      expect(first()).toBe(51);
    });

    test("a mid-validation dirty mark runs the effect despite an equal recompute", () => {
      const base = signal(0);
      const pointfree = computed(() => {
        base();
        return 7;
      });
      const runs = vi.fn(() => {
        pointfree();
        base();
      });
      effect(runs);
      expect(runs).toHaveBeenCalledTimes(1);

      // Validation dives through pointfree, commits base, and the shallow mark from
      // that commit dirties the effect directly; pointfree then recomputes equal, but
      // the effect's own dirty state survives — the direct dependency changed
      base(1);
      expect(runs).toHaveBeenCalledTimes(2);
      expect(pointfree()).toBe(7);
    });
  });
});
