import { describe, expect, test, mock } from "bun:test";
import { effect, flush, signal } from "@hellajs/core";

describe("core", () => {
  describe("flush", () => {
    test("flush runs the effects left queued by an aborted drain", () => {
      const s = signal(0);

      // The thrower subscribes first, so the drain reaches it before the survivor
      const thrower = mock(() => {
        if (s() > 0) throw new Error("drain aborted");
      });
      const survivor = mock(() => { s(); });
      effect(thrower);
      effect(survivor);
      thrower.mockClear();
      survivor.mockClear();

      // The write's drain aborts at the thrower, leaving the survivor queued
      expect(() => s(1)).toThrow("drain aborted");
      expect(survivor).not.toHaveBeenCalled();

      flush();
      expect(survivor).toHaveBeenCalledTimes(1);
    });

    test("flush on an idle queue runs no effects", () => {
      const s = signal(0);
      const runs = mock(() => { s(); });
      effect(runs);
      runs.mockClear();

      flush();
      expect(runs).not.toHaveBeenCalled();
    });
  });
});
