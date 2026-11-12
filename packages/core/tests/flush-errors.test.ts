import { describe, expect, test, vi, afterEach } from "vite-plus/test";
import { effect, flush, setFlushErrorHandler, signal } from "@hellajs/core";
import { delay } from "@utils/test-helpers.js";

afterEach(() => {
  setFlushErrorHandler(null);
});

describe("core", () => {
  describe("setFlushErrorHandler", () => {
    test("a scheduled-drain throw calls the handler once and a later write's flush recovers the survivors", async () => {
      const s = signal(0);
      const tick = signal(0);
      const error = new Error("drain aborted");
      const handler = vi.fn<(error: unknown) => void>(() => {});
      setFlushErrorHandler(handler);
      const thrower = vi.fn(() => {
        if (s() > 0) throw error;
      });
      const survivor = vi.fn(() => {
        s();
        tick();
      });
      effect(thrower);
      effect(survivor);
      thrower.mockClear();
      survivor.mockClear();

      // Capture the scheduled drain so the handled abort never leaks an
      // unhandled rejection into the runner
      const scheduled: Array<() => void> = [];
      const nativeQueueMicrotask = globalThis.queueMicrotask;
      globalThis.queueMicrotask = (callback: () => void) => {
        scheduled.push(callback);
      };
      try {
        s(1);
        scheduled[0]!(); // thrower throws — dispatch, abort, survivors intact
      } finally {
        globalThis.queueMicrotask = nativeQueueMicrotask;
      }

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(error);
      expect(thrower).toHaveBeenCalledTimes(1);
      expect(survivor).not.toHaveBeenCalled();

      tick(1); // schedules a fresh drain on the real microtask
      await delay();
      expect(survivor).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledTimes(1); // no second dispatch
    });

    test("manual flush over the same throwing effect throws to its caller and skips the handler", async () => {
      const s = signal(0);
      const handler = vi.fn<(error: unknown) => void>(() => {});
      setFlushErrorHandler(handler);
      const thrower = vi.fn(() => {
        if (s() > 0) throw new Error("manual flush throw");
      });
      effect(thrower);
      thrower.mockClear();

      s(1);
      expect(() => flush()).toThrow("manual flush throw");
      expect(handler).not.toHaveBeenCalled();

      await delay(); // the pending scheduled drain then finds an empty remainder
      expect(handler).not.toHaveBeenCalled();
    });

    test("unregistering the handler restores the rethrow path while preserving queue survivors", () => {
      const s = signal(0);
      const handler = vi.fn<(error: unknown) => void>(() => {});
      setFlushErrorHandler(handler);
      const thrower = vi.fn(() => {
        if (s() > 0) throw new Error("rethrow path");
      });
      const survivor = vi.fn(() => {
        s();
      });
      effect(thrower);
      effect(survivor);
      thrower.mockClear();
      survivor.mockClear();
      setFlushErrorHandler(null);

      const scheduled: Array<() => void> = [];
      const nativeQueueMicrotask = globalThis.queueMicrotask;
      globalThis.queueMicrotask = (callback: () => void) => {
        scheduled.push(callback);
      };
      try {
        s(1);
        expect(() => scheduled[0]!()).toThrow("rethrow path");
      } finally {
        globalThis.queueMicrotask = nativeQueueMicrotask;
      }
      expect(handler).not.toHaveBeenCalled();

      flush(); // survivors recover on the next flush
      expect(survivor).toHaveBeenCalledTimes(1);
    });

    test("a throwing handler does not corrupt the queue and the next flush recovers the survivors", () => {
      const s = signal(0);
      setFlushErrorHandler(() => {
        throw new Error("handler threw");
      });
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

      const scheduled: Array<() => void> = [];
      const nativeQueueMicrotask = globalThis.queueMicrotask;
      globalThis.queueMicrotask = (callback: () => void) => {
        scheduled.push(callback);
      };
      try {
        s(1);
        expect(() => scheduled[0]!()).toThrow("handler threw");
      } finally {
        globalThis.queueMicrotask = nativeQueueMicrotask;
      }

      flush(); // abort semantics held — survivors recover
      expect(survivor).toHaveBeenCalledTimes(1);
    });
  });
});
