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
  });
});
