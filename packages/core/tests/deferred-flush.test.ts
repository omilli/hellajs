import { describe, expect, test, vi } from "vite-plus/test";
import { computed, effect, flush, signal } from "@hellajs/core";
import { delay } from "@utils/test-helpers.js";

describe("core", () => {
  describe("deferred flush", () => {
    test("a write does not run effects synchronously; one microtask hop drains once", async () => {
      const count = signal(0);
      const runs = vi.fn(() => count());
      effect(runs);

      // Initial render stays synchronous (first run executes at creation)
      expect(runs).toHaveBeenCalledTimes(1);
      runs.mockClear();

      count(1);
      expect(runs).not.toHaveBeenCalled();

      // One microtask hop reaches the scheduled drain
      await delay();
      expect(runs).toHaveBeenCalledTimes(1);
      expect(count()).toBe(1);
    });

    test("two writes to two signals in one tick run a cross-subscribing effect once with final values", async () => {
      const count = signal(0);
      const filter = signal("all");
      const runs = vi.fn(() => `${count()}:${filter()}`);
      effect(runs);

      count(1);
      filter("done");
      await delay();

      // The $update glitch fix, as a core-level test: one drain, final state
      expect(runs).toHaveBeenCalledTimes(2);
      expect(runs).toHaveLastReturnedWith("1:done");
    });

    test("a cancel-out pair in one tick still runs a signals-only effect once", async () => {
      const a = signal(0);
      const runs = vi.fn(() => a());
      effect(runs);
      runs.mockClear();

      // Signal writes prove change at write time, so signal-only effects run without
      // flush-time stale validation — a canceling pair still costs one drain run
      a(1);
      a(0);
      await delay();
      expect(runs).toHaveBeenCalledTimes(1);
      expect(a()).toBe(0);
    });

    test("a cancel-out pair in one tick skips a computed-mediated effect", async () => {
      const a = signal(0);
      const value = computed(() => a() + 1);
      const runs = vi.fn(() => value());
      effect(runs);
      runs.mockClear();

      a(1);
      a(0);
      await delay();
      expect(runs).not.toHaveBeenCalled();
      expect(value()).toBe(1);
    });

    test("a write inside an effect body appends its subscribers later in the same drain pass", async () => {
      const a = signal(0);
      const b = signal(0);
      const order: string[] = [];
      const writer = vi.fn(() => {
        order.push("writer");
        a();
        b(a());
        order.push("writer:done");
      });
      const reader = vi.fn(() => {
        order.push("reader");
        b();
      });
      effect(writer);
      effect(reader);
      order.length = 0;

      a(1);
      await delay();

      // The reader was queued mid-pass and ran after the writer completed —
      // not before the writer's next line (the old nested-flush interleaving)
      expect(order).toEqual(["writer", "writer:done", "reader"]);
      expect(reader).toHaveBeenCalledTimes(2);
      expect(b()).toBe(1);
    });

    test("nested write clusters still drain once per tick", async () => {
      const a = signal(0);
      const b = signal(0);
      const writer = vi.fn(() => b(a() * 2));
      const reader = vi.fn(() => `${a()}:${b()}`);
      effect(writer);
      effect(reader);

      a(3);
      await delay();

      // The reader was queued by a's write and re-notified mid-pass by the
      // writer's write — the queue dedup folds both into one drain run
      expect(writer).toHaveBeenCalledTimes(2);
      expect(reader).toHaveBeenCalledTimes(2);
      expect(reader).toHaveLastReturnedWith("3:6");
    });
  });
});
