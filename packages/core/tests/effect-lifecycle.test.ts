import { describe, test, expect, vi } from "vite-plus/test";
import { effect, signal } from "@hellajs/core";

describe("core", () => {
  describe("effect lifecycle", () => {
    test("cleanup disposing its own effect skips the re-run", () => {
      const count = signal(0);
      let disposer: () => void = () => {};
      const runs = vi.fn(() => {
        count();
        return () => disposer();
      });
      disposer = effect(runs);
      expect(runs).toHaveBeenCalledTimes(1);

      // The cleanup disposes the effect before the re-run: the scheduler sees the
      // zeroed flags and stops — the disposed effect never re-executes
      count(1);
      expect(runs).toHaveBeenCalledTimes(1);

      // The disposal also dropped the subscription
      count(2);
      expect(runs).toHaveBeenCalledTimes(1);
    });

    test("disposing a nested effect detaches it from its parent", () => {
      const count = signal(0);
      const childRuns = vi.fn(() => {
        count();
      });
      let childStop: () => void = () => {};
      const parentRuns = vi.fn(() => {
        childStop = effect(childRuns);
      });
      effect(parentRuns);
      expect(childRuns).toHaveBeenCalledTimes(1);

      childStop();
      count(1);
      expect(childRuns).toHaveBeenCalledTimes(1);
      expect(parentRuns).toHaveBeenCalledTimes(1);
    });

    test("a separate effect tracks and disposes independently of its creating parent", () => {
      const count = signal(0);
      const childRuns = vi.fn(() => count());
      let childStop: () => void = () => {};
      effect(() => {
        childStop = effect(childRuns, { separate: true });
      });
      expect(childRuns).toHaveBeenCalledTimes(1);

      // Tracks its own dependencies: re-runs on writes to them
      count(1);
      expect(childRuns).toHaveBeenCalledTimes(2);

      // The returned cleanup disposes it
      childStop();
      count(2);
      expect(childRuns).toHaveBeenCalledTimes(2);
    });

    test("a parent re-run neither disposes nor re-runs its separate child", () => {
      const parentDep = signal(0);
      const childDep = signal(0);
      const childRuns = vi.fn(() => childDep());
      effect(() => {
        parentDep();
        effect(childRuns, { separate: true });
      });
      expect(childRuns).toHaveBeenCalledTimes(1); // first child's synchronous first run

      // The parent re-run registers a fresh separate child (+1 for its first run);
      // the first child itself was neither re-run (would be 3) nor disposed (would
      // stop at 1) by the parent's re-run
      parentDep(1);
      expect(childRuns).toHaveBeenCalledTimes(2);

      // Both children are alive and track their own dependency (+2)
      childDep(1);
      expect(childRuns).toHaveBeenCalledTimes(4);
    });
  });
});
