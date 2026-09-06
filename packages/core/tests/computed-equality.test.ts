import { describe, expect, test, mock } from "bun:test";
import { computed, effect, signal } from "@hellajs/core";

describe("core", () => {
  describe("computed equality option", () => {
    test("equals returning true keeps the old reference and skips downstream effects", () => {
      const items = signal([1, 2, 3]);
      const doubled = computed(() => items().map(x => x * 2), {
        equals: (a, b) => a.length === b.length && a.every((v, i) => v === b[i])
      });

      const runs = mock(() => { doubled(); });
      effect(runs);
      expect(runs).toHaveBeenCalledTimes(1);

      const before = doubled();
      items([1, 2, 3]); // New array reference, same content: recomputes to an equal result
      expect(runs).toHaveBeenCalledTimes(1); // Downstream not re-run
      expect(doubled()).toBe(before); // Old cached reference retained
    });

    test("equals returning false propagates to subscribers", () => {
      const items = signal([1, 2, 3]);
      const doubled = computed(() => items().map(x => x * 2), {
        equals: (a, b) => a.length === b.length && a.every((v, i) => v === b[i])
      });

      const runs = mock(() => { doubled(); });
      effect(runs);

      items([4]); // Content-different: propagates
      expect(runs).toHaveBeenCalledTimes(2);
      expect(doubled()).toEqual([8]);
    });

    test("non-function equals throws a validation error", () => {
      expect(() => computed(() => 1, { equals: "nope" as unknown as (a: number, b: number) => boolean }))
        .toThrow("[core] computed: equals must be a function, received string");
    });
  });
});
