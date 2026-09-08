import { describe, test, expect, mock } from "bun:test";
import { effect, flush } from "@hellajs/core";
import { store } from "@hellajs/store/bundle";

describe("store", () => {
describe("future", () => {
  test("materializes unknown keys on the first update write", () => {
    const s = store({ count: 0 });

    const s1 = s.update({ tags: ["a"], maxUses: 3 });

    // typed reads on the returned reference — the widening is the contract
    const tags: string[] = s1.tags();
    const maxUses: number = s1.maxUses();
    expect(tags).toEqual(["a"]);
    expect(maxUses).toBe(3);
    // the widened reference types the added keys; the original reference is the
    // same object, so its runtime snapshot grows with them
    expect(s1.snapshot()).toEqual({ count: 0, tags: ["a"], maxUses: 3 });
  });

  test("returns the same store object typed with the added keys", () => {
    const s = store({ count: 0 });

    const s1 = s.update({ tags: ["a"] });

    expect(s1 as unknown as typeof s).toBe(s);
  });

  test("materializes plain-object keys as nested stores and deep-merges later updates", () => {
    const s = store({ count: 0 });

    const s1 = s.update({ user: { name: "Bob" } });
    s1.update({ user: { age: 1 } });

    // name survives the second write: the recursion branch updated the
    // materialized store instead of re-materializing it; the nested add is
    // untyped on the parent, so the assertion reads through a widened cast
    expect(s1.snapshot().user as Record<string, unknown>).toEqual({ name: "Bob", age: 1 });

    // nested stores grow through their own widened references
    const nested = s1.user.update({ email: "bob@example.com" });
    expect(nested.email()).toBe("bob@example.com");
  });

  test("accumulates added keys across chained updates", () => {
    const s = store({ count: 0 });

    const s1 = s.update({ tags: ["a"] });
    const s2 = s1.update({ max: 1 });

    const tags: string[] = s2.tags();
    const max: number = s2.max();
    const count: number = s2.count();
    expect(tags).toEqual(["a"]);
    expect(max).toBe(1);
    expect(count).toBe(0);
  });

  test("materializes draft-path additions at runtime", () => {
    const s = store({ count: 0 });

    // the draft mutator is typed against the current shape, so the add is
    // cast; the direct path is the typed way to grow a store
    s.update(draft => {
      (draft as { tags?: string[] }).tags = ["b"];
    });

    // draft additions stay untyped — the cast is the documented seam
    expect(s.snapshot() as Record<string, unknown>).toEqual({ count: 0, tags: ["b"] });
  });

  test("re-runs snapshot effects exactly once when a key materializes", () => {
    const s = store({ count: 0 });
    const tracker = mock(() => s.snapshot());

    effect(tracker);
    expect(tracker).toHaveBeenCalledTimes(1);

    s.update({ tags: ["a"] });
    flush();

    expect(tracker).toHaveBeenCalledTimes(2);
  });

  test("materializes earlier keys before a later reserved key throws", () => {
    const s = store({ count: 0 });

    expect(() => {
      s.update({ tags: ["a"], snapshot: 1 });
    }).toThrow('[store] update: reserved key "snapshot"');

    // no atomicity: the add landed before the throw, matching existing-key behavior
    // (s's type stays stale; the runtime snapshot grew)
    expect(s.snapshot() as Record<string, unknown>).toEqual({ count: 0, tags: ["a"] });
  });

  test("throws on function values for new keys without materializing", () => {
    const s = store({ count: 0 });

    expect(() => {
      s.update({ onSave: () => "x" });
    }).toThrow('[store] update: key "onSave" cannot hold a function');

    expect(s.snapshot()).toEqual({ count: 0 });
    expect("onSave" in s).toBe(false);
  });

  test("throws on adding keys to a readonly store without materializing", () => {
    const s = store({ count: 0 }, { readonly: true });

    expect(() => {
      s.update({ tags: [] });
    }).toThrow('[store] readonly key "tags"');

    expect(s.snapshot()).toEqual({ count: 0 });
    expect("tags" in s).toBe(false);
  });

  test("subscribes to added keys after they materialize", () => {
    const s = store({ count: 0 });

    expect(() => {
      // @ts-expect-error tags is not a settable key until it materializes
      s.subscribe("tags", () => {});
    }).toThrow('[store] subscribe: "tags" is not a settable key');

    const s1 = s.update({ tags: ["a"] });
    const seen = mock<(next: string[], prev: string[]) => void>(() => {});
    s1.subscribe("tags", seen);

    s1.update({ tags: ["b"] });
    expect(seen).toHaveBeenCalledTimes(1);
    expect(seen.mock.calls[0]).toEqual([["b"], ["a"]]);
  });

  test("applies no middleware to added keys", () => {
    const s = store({ count: 0 }, { middleware: { count: (v: number) => v * 2 } });

    const s1 = s.update({ tags: ["a"] });
    expect(s1.tags()).toEqual(["a"]);

    s1.update({ tags: ["b"] });
    expect(s1.tags()).toEqual(["b"]);
  });

  test("runs cleanup on added nested stores and keeps signals functional", () => {
    const s = store({ count: 0 });
    const s1 = s.update({ user: { name: "Bob" } });

    const nested = s1.user;
    const originalCleanup = nested.cleanup;
    const nestedCleaned = mock(() => {});
    Object.defineProperty(nested, "cleanup", {
      value: function () {
        nestedCleaned();
        originalCleanup.call(this);
      },
      writable: false,
      enumerable: true,
      configurable: true
    });

    s.cleanup();
    expect(nestedCleaned).toHaveBeenCalledTimes(1);

    s1.update({ user: { name: "Alice" } });
    expect(s1.snapshot().user).toEqual({ name: "Alice" });
  });

  test("still throws on externally-replaced properties", () => {
    const s = store({ count: 0 });
    Object.defineProperty(s, "x", { value: 5, enumerable: true, configurable: true });

    expect(() => {
      s.update({ x: 6 });
    }).toThrow('[store] update: unknown key "x"');

    // the keys signal predates the replacement, so the snapshot never saw x
    expect(s.snapshot()).toEqual({ count: 0 });
  });
});
});
