import { describe, test, expect, mock } from "bun:test";
import { effect } from "@hellajs/core";
import { store } from "@hellajs/store/bundle";

describe("store", () => {
describe("snapshot", () => {
  test("returns plain object with all properties", () => {
    const cart = store({
      items: [{ id: 1 }],
      total: 1.50,
      helper: () => "computed helper"
    });

    const snapshot = cart.snapshot();

    expect(snapshot.items).toEqual([{ id: 1 }]);
    expect(snapshot.total).toBe(1.50);
    expect(snapshot.helper()).toBe("computed helper");
    expect("snapshot" in snapshot).toBe(false);
    expect("computed" in snapshot).toBe(false);
  });

  test("is reactive: effect re-runs on property change", () => {
    const data = store({ name: "Alice", age: 30 });
    let lastSnapshot: { name: string; age: number } | null = null;

    const runs = mock(() => {
      lastSnapshot = data.snapshot() as { name: string; age: number };
    });
    effect(runs);

    expect(runs).toHaveBeenCalledTimes(1);
    expect(lastSnapshot!.name).toBe("Alice");

    data.name("Bob");

    expect(runs).toHaveBeenCalledTimes(2);
    expect(lastSnapshot!.name).toBe("Bob");
  });

  test("is reactive with deeply nested properties", () => {
    const data = store({
      user: {
        profile: {
          name: "John",
          settings: { theme: "dark" }
        }
      }
    });

    const tracker = mock(() => { });
    let lastSnap: Record<string, unknown> = {};

    effect(() => {
      lastSnap = data.snapshot() as Record<string, unknown>;
      tracker();
    });

    expect(tracker).toHaveBeenCalledTimes(1);
    expect((lastSnap as { user: { profile: { name: string } } }).user.profile.name).toBe("John");

    data.user.profile.settings.theme("light");

    expect(tracker).toHaveBeenCalledTimes(2);
    expect((lastSnap as { user: { profile: { settings: { theme: string } } } }).user.profile.settings.theme).toBe("light");
  });

  test("snapshot is reactive across deeply nested composed stores", () => {
    const innerStore = store({ value: "a" });
    const midStore = store({ inner: innerStore });
    const outerStore = store({ mid: midStore });
    const tracker = mock(() => {});

    effect(() => {
      outerStore.snapshot();
      tracker();
    });

    expect(tracker).toHaveBeenCalledTimes(1);

    innerStore.value("b");

    expect(tracker).toHaveBeenCalledTimes(2);
  });

  test("snapshot is reactive across composed stores with array leaves", () => {
    const itemsStore = store({ items: [1, 2, 3] });
    const containerStore = store({ data: itemsStore });
    const tracker = mock(() => {});

    effect(() => {
      containerStore.snapshot();
      tracker();
    });

    expect(tracker).toHaveBeenCalledTimes(1);

    itemsStore.items([1, 2, 3, 4]);

    expect(tracker).toHaveBeenCalledTimes(2);
  });

  test("snapshot is reactive across composed stores with readonly properties", () => {
    const innerStore = store({ name: "Alice", age: 30 }, { readonly: ["name"] });
    const appStore = store({ user: innerStore });
    const tracker = mock(() => {});

    effect(() => {
      appStore.snapshot();
      tracker();
    });

    expect(tracker).toHaveBeenCalledTimes(1);

    innerStore.age(31);

    expect(tracker).toHaveBeenCalledTimes(2);
  });

  test("composed snapshot returns plain values for leaf properties", () => {
    const userStore = store({ name: "Alice" });
    const appStore = store({ user: userStore });

    const snap = appStore.snapshot();

    expect(snap.user.name).toBe("Alice");
    expect(typeof snap.user.name).not.toBe("function");
  });

  test("composed snapshot unwraps array leaf signals to values", () => {
    const dataStore = store({ items: [1, 2, 3] });
    const containerStore = store({ data: dataStore });

    const snap = containerStore.snapshot();

    expect(snap.data.items).toEqual([1, 2, 3]);
  });

  test("composed snapshot of nested composed stores returns plain values", () => {
    const innerStore = store({ value: "a" });
    const midStore = store({ inner: innerStore });
    const outerStore = store({ mid: midStore });

    const snap = outerStore.snapshot();

    expect(snap.mid.inner.value).toBe("a");
  });

  test("composed snapshot preserves original functions", () => {
    const helperStore = store({ count: 0, double: () => 4 });
    const appStore = store({ helper: helperStore });

    const snap = appStore.snapshot();

    expect(typeof snap.helper.double).toBe("function");
    expect(snap.helper.double()).toBe(4);
  });

  test("external reassignment of signal properties throws TypeError", () => {
    const data = store({ value: "a" });

    expect(() => {
      // @ts-expect-error signal-backed properties are non-writable — reassignment would drop reactivity
      data.value = 42;
    }).toThrow(TypeError);

    expect(data.snapshot()).toEqual({ value: "a" });
    data.value("b");
    expect(data.snapshot()).toEqual({ value: "b" });
  });

  test("snapshot includes externally replaced composed leaves as plain values", () => {
    const innerStore = store({ value: "a" });
    const containerStore = store({ inner: innerStore });

    // Composed leaves are adopted signal functions — function-valued properties stay swappable
    // @ts-expect-error external reassignment replaces the adopted signal (function props are writable)
    containerStore.inner.value = 42;

    const snap = containerStore.snapshot();
    // Runtime holds the plain replaced value; the store type still claims Signal<string>
    expect(snap.inner.value as unknown as number).toBe(42);
  });

  test("empty store snapshot", () => {
    const data = store({});
    expect(data.snapshot()).toEqual({});
  });
});
});
