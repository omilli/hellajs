import { describe, test, expect, mock } from "bun:test";
import { store } from "@hellajs/store/bundle";

describe("store", () => {
  describe("update", () => {
    test("performs partial updates", () => {
      const user = store({
        profile: { name: "Alice", email: "alice@example.com" },
        settings: { theme: "light", notifications: true }
      });

      user.update({
        profile: { email: "alice.doe@example.com" },
        settings: { theme: "dark" }
      });

      expect(user.profile.name()).toBe("Alice");
      expect(user.profile.email()).toBe("alice.doe@example.com");
      expect(user.settings.theme()).toBe("dark");
      expect(user.settings.notifications()).toBe(true);
    });

    test("silently ignores keys absent from initial object", () => {
      const data = store({ a: 1, b: 2 });

      data.update({ a: 10, c: 99 } as never);

      expect(data.a()).toBe(10);
      expect(data.b()).toBe(2);
      expect("c" in data).toBe(false);
    });

    test("empty array update", () => {
      const data = store({ items: [1, 2, 3] });

      data.update({ items: [] });

      expect(data.items()).toEqual([]);
    });

    test("mutates draft for partial updates", () => {
      const data = store({
        name: "John",
        age: 30,
        settings: { theme: "light" }
      });

      data.update(draft => {
        draft.name = "Jane";
        draft.age = 25;
      });

      expect(data.name()).toBe("Jane");
      expect(data.age()).toBe(25);
      expect(data.settings.theme()).toBe("light");
    });

    test("handles array mutations", () => {
      const data = store({
        items: [1, 2, 3],
        count: 0
      });

      data.update(draft => {
        draft.items.push(4, 5);
        draft.count = draft.items.length;
      });

      expect(data.items()).toEqual([1, 2, 3, 4, 5]);
      expect(data.count()).toBe(5);
    });

    test("handles nested object mutations", () => {
      const data = store({
        user: {
          profile: {
            name: "John",
            email: "john@example.com"
          }
        }
      });

      data.update(draft => {
        draft.user.profile.name = "Jane";
        draft.user.profile.email = "jane@example.com";
      });

      expect(data.user.profile.name()).toBe("Jane");
      expect(data.user.profile.email()).toBe("jane@example.com");
    });

    test("handles array splice and pop", () => {
      const data = store({
        items: [1, 2, 3, 4, 5]
      });

      data.update(draft => {
        draft.items.splice(1, 2);
        draft.items.pop();
      });

      expect(data.items()).toEqual([1, 4]);
    });

    test("changes primitive to object in draft", () => {
      const data = store<{
        payload: string | { nested: boolean; value: string };
        other: number
      }>({
        payload: "string",
        other: 123
      });

      data.update(draft => {
        draft.payload = { nested: true, value: "changed" };
      });

      expect(data.payload()).toEqual({ nested: true, value: "changed" });
      expect(data.other()).toBe(123);
    });

    test("detects changed array elements in draft", () => {
      const data = store({ items: [1, 2, 3] });

      data.update(draft => {
        draft.items[1] = 99;
      });

      expect(data.items()).toEqual([1, 99, 3]);
    });

    test("only applies changed properties", () => {
      const data = store({
        a: 1,
        b: 2,
        c: 3
      });

      const aTracker = mock(() => { });
      const bTracker = mock(() => { });

      effect(() => {
        data.a();
        aTracker();
      });

      effect(() => {
        data.b();
        bTracker();
      });

      data.update(draft => {
        draft.a = 1;
        draft.b = 20;
      });

      expect(data.a()).toBe(1);
      expect(data.b()).toBe(20);
      expect(data.c()).toBe(3);
      expect(aTracker).toHaveBeenCalledTimes(1);
      expect(bTracker).toHaveBeenCalledTimes(2);
    });

    test("unchanged arrays do not trigger updates", () => {
      const data = store({
        items: [1, 2, 3],
        count: 0
      });

      const itemsTracker = mock(() => { });
      const countTracker = mock(() => { });

      effect(() => {
        data.items();
        itemsTracker();
      });

      effect(() => {
        data.count();
        countTracker();
      });

      data.update(draft => {
        // Access items without mutating — count change is the only write
        draft.count = 10;
      });

      expect(data.items()).toEqual([1, 2, 3]);
      expect(data.count()).toBe(10);
      expect(itemsTracker).toHaveBeenCalledTimes(1);
      expect(countTracker).toHaveBeenCalledTimes(2);
    });

    test("empty partial is a no-op", () => {
      const data = store({ a: 1, b: 2 });
      data.update({});
      expect(data.a()).toBe(1);
      expect(data.b()).toBe(2);
    });

    test("empty draft function is a no-op", () => {
      const data = store({ a: 1, b: 2 });
      data.update(() => { });
      expect(data.a()).toBe(1);
      expect(data.b()).toBe(2);
    });

    test("batched store updates trigger effects once", () => {
      const data = store({ x: 0, y: 0 });
      const tracker = mock(() => { });

      effect(() => {
        data.x();
        data.y();
        tracker();
      });

      expect(tracker).toHaveBeenCalledTimes(1);

      batch(() => {
        data.x(1);
        data.y(2);
      });

      expect(data.x()).toBe(1);
      expect(data.y()).toBe(2);
      expect(tracker).toHaveBeenCalledTimes(2);
    });

    test("batch wraps update(draft)", () => {
      const data = store({ x: 0, y: 0 });
      const tracker = mock(() => { });

      effect(() => {
        data.x();
        data.y();
        tracker();
      });

      expect(tracker).toHaveBeenCalledTimes(1);

      batch(() => {
        data.update(draft => {
          draft.x = 1;
          draft.y = 2;
        });
      });

      expect(tracker).toHaveBeenCalledTimes(2);
    });
  });
});
