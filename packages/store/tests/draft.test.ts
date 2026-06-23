import { describe, test, expect } from "bun:test";
import { store } from "@hellajs/store/bundle";

describe("store", () => {
  describe("draft", () => {
    test("clones Date in draft update", () => {
      const data = store({ timestamp: new Date("2024-01-15T12:00:00Z") });
      const original = data.timestamp();

      data.update(draft => {
        draft.timestamp.setHours(0, 0, 0, 0);
      });

      expect(data.timestamp()).toBeInstanceOf(Date);
      expect(data.timestamp()).not.toBe(original);
      expect(data.timestamp().getHours()).toBe(0);
      expect(original.getHours()).toBe(12);
    });

    test("clones Map in draft update", () => {
      const data = store({ lookup: new Map([["a", 1], ["b", 2]]) });
      const original = data.lookup();

      data.update(draft => {
        draft.lookup.set("c", 3);
      });

      expect(data.lookup()).toBeInstanceOf(Map);
      expect(data.lookup()).not.toBe(original);
      expect(data.lookup().get("c")).toBe(3);
      expect(original.has("c")).toBe(false);
    });

    test("clones Set in draft update", () => {
      const data = store({ tags: new Set(["a", "b"]) });
      const original = data.tags();

      data.update(draft => {
        draft.tags.add("c");
      });

      expect(data.tags()).toBeInstanceOf(Set);
      expect(data.tags()).not.toBe(original);
      expect(data.tags().has("c")).toBe(true);
      expect(original.has("c")).toBe(false);
    });

    test("replaces RegExp via draft update", () => {
      const data = store({ pattern: /old/ });
      const original = data.pattern();

      data.update(draft => {
        draft.pattern = new RegExp("new", "g");
      });

      expect(data.pattern()).toBeInstanceOf(RegExp);
      expect(data.pattern()).not.toBe(original);
      expect(data.pattern().source).toBe("new");
      expect(data.pattern().flags).toBe("g");
    });

    test("clones deeply nested Map values in draft update", () => {
      const data = store({
        lookup: new Map<string, { name: string }>([["k", { name: "Alice" }]])
      });

      data.update(draft => {
        draft.lookup.get("k")!.name = "Bob";
      });

      expect(data.lookup()).toBeInstanceOf(Map);
      expect(data.lookup().get("k")!.name).toBe("Bob");
    });
  });
});
