import { describe, test, expect, mock } from "bun:test";
import { effect, flush } from "@hellajs/core";
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

    test("leaves untouched Date signal unwritten", () => {
      const data = store({ timestamp: new Date("2024-01-15T12:00:00Z"), count: 0 });
      const original = data.timestamp();

      data.update(draft => {
        draft.count = 1;
      });

      expect(data.timestamp()).toBe(original);
    });

    test("leaves untouched object-element array unwritten", () => {
      const data = store({ items: [{ id: 1 }, { id: 2 }], count: 0 });
      const original = data.items();

      data.update(draft => {
        draft.count = 1;
      });

      expect(data.items()).toBe(original);
    });

    test("leaves untouched Map and Set signals unwritten", () => {
      const data = store({
        lookup: new Map([["a", 1]]),
        tags: new Set(["x"]),
        count: 0
      });
      const originalMap = data.lookup();
      const originalSet = data.tags();

      data.update(draft => {
        draft.count = 1;
      });

      expect(data.lookup()).toBe(originalMap);
      expect(data.tags()).toBe(originalSet);
    });

    test("leaves untouched Set of objects unwritten", () => {
      const data = store({ members: new Set([{ id: 1 }, { id: 2 }]), count: 0 });
      const original = data.members();

      data.update(draft => {
        draft.count = 1;
      });

      expect(data.members()).toBe(original);
    });

    test("rewrites a Set when an object member is mutated", () => {
      const data = store({ members: new Set([{ id: 1 }, { id: 2 }]) });

      data.update(draft => {
        for (const member of draft.members) {
          if (member.id === 1) { member.id = 99; }
        }
      });

      expect(data.members()).toBeInstanceOf(Set);
      expect(Array.from(data.members()).some(member => member.id === 99)).toBe(true);
    });

    test("preserves class instance prototype when the draft mutates it", () => {
      class Point {
        x: number;
        constructor(x: number) { this.x = x; }
      }
      const data = store({ point: new Point(1), count: 0 });

      data.update(draft => {
        draft.point.x = 5;
      });

      expect(data.point()).toBeInstanceOf(Point);
      expect(data.point().x).toBe(5);
    });

    test("does not re-fire effects subscribed to untouched properties", () => {
      const data = store({ timestamp: new Date(1000), count: 0 });
      const tracker = mock(() => { });

      effect(() => {
        data.timestamp();
        tracker();
      });
      flush();

      data.update(draft => {
        draft.count = 1;
      });
      flush();

      expect(tracker).toHaveBeenCalledTimes(1);
      expect(data.count()).toBe(1);
    });
  });
});
