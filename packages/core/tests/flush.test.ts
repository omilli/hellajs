import { describe, expect, test, vi } from "vite-plus/test";
import { effect, flush, setFlushErrorHandler, signal } from "@hellajs/core";
import { delay } from "@utils/test-helpers.js";

describe("core", () => {
  describe("flush", () => {
    test("the scheduled drain aborts on a throw and preserves queue survivors for the next flush", () => {
      const s = signal(0);
      const thrower = vi.fn(() => {
        if (s() > 0) throw new Error("drain aborted");
      });
      const survivor = vi.fn(() => {
        s();
      });
      effect(thrower);
      effect(survivor);
      thrower.mockClear();
      survivor.mockClear();

      // The shared test helpers load @hellajs/dom, whose errors feature installs
      // itself as the scheduled-drain handler at module init; the bare-core
      // rethrow path under pin is opt-in
      setFlushErrorHandler(null);

      // Capture the scheduled microtask so the unit-01 drain throw can be
      // asserted without leaking an unhandled rejection into the runner —
      // unguarded, this callback surfaces as an unhandled microtask rejection
      const scheduled: Array<() => void> = [];
      const nativeQueueMicrotask = globalThis.queueMicrotask;
      globalThis.queueMicrotask = (callback: () => void) => {
        scheduled.push(callback);
      };
      try {
        s(1);
        expect(scheduled).toHaveLength(1);
        // The drain runs the thrower (subscribed first) and aborts before the survivor
        expect(() => scheduled[0]!()).toThrow("drain aborted");
        expect(thrower).toHaveBeenCalledTimes(1);
        expect(survivor).not.toHaveBeenCalled();
      } finally {
        globalThis.queueMicrotask = nativeQueueMicrotask;
      }

      // The next drain recovers the survivors
      flush();
      expect(survivor).toHaveBeenCalledTimes(1);
    });

    test("flush drains synchronously and the pending scheduled microtask afterwards is a no-op", async () => {
      const s = signal(0);
      const runs = vi.fn(() => {
        s();
      });
      effect(runs);
      runs.mockClear();

      s(1);
      flush(); // synchronous drain — effect runs now, before the microtask fires
      expect(runs).toHaveBeenCalledTimes(1);

      await delay(); // the pending microtask then drains an empty queue
      expect(runs).toHaveBeenCalledTimes(1); // no double run
    });

    test("a manual-flush drain throw propagates to the flush caller", () => {
      const s = signal(0);
      effect(() => {
        if (s() > 0) throw new Error("drain throws");
      });

      s(1);
      expect(() => flush()).toThrow("drain throws");
    });

    test("flush on an idle queue runs no effects", () => {
      const s = signal(0);
      const runs = vi.fn(() => {
        s();
      });
      effect(runs);
      runs.mockClear();

      flush();
      expect(runs).not.toHaveBeenCalled();
    });
  });
});
