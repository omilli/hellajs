import { describe, test, expect } from "bun:test";
import { store } from "../../packages/store";

describe("store", () => {
  test("basic operations and data types", () => {
    const data = store({
      num: 42,
      str: "hello",
      bool: true,
      arr: [1, 2, 3],
      obj: { nested: "value" },
      nullVal: null,
      undefinedVal: undefined,
      func: () => "helper"
    });

    expect(data.num()).toBe(42);
    expect(data.str()).toBe("hello");
    expect(data.bool()).toBe(true);
    expect(data.arr()).toEqual([1, 2, 3]);
    expect(data.obj.nested()).toBe("value");
    expect(data.nullVal()).toBe(null);
    expect(data.undefinedVal()).toBeUndefined();
    expect(data.func()).toBe("helper");

    data.num(100);
    data.str("world");
    data.obj.nested("updated");

    expect(data.num()).toBe(100);
    expect(data.str()).toBe("world");
    expect(data.obj.nested()).toBe("updated");
  });

  test("set method replaces entire state", () => {
    const settings = store({
      theme: "light",
      notifications: { enabled: true, sound: "default" }
    });

    settings.set({
      theme: "dark",
      notifications: { enabled: false, sound: "none" }
    });

    expect(settings.theme()).toBe("dark");
    expect(settings.notifications.enabled()).toBe(false);
    expect(settings.notifications.sound()).toBe("none");
  });

  test("update method performs partial updates", () => {
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

  test("computed method returns snapshots", () => {
    const cart = store({
      items: [{ id: 1 }],
      total: 1.50,
      helper: () => "computed helper"
    });

    const snapshot = cart.computed();

    expect(snapshot.items).toEqual([{ id: 1 }]);
    expect(snapshot.total).toBe(1.50);
    expect(snapshot.helper()).toBe("computed helper");
    expect("computed" in snapshot).toBe(false);
    expect("set" in snapshot).toBe(false);
  });

  test("cleanup calls nested store cleanup methods", () => {
    const data = store({
      level1: { level2: { value: "deep" } }
    });

    let level1Cleaned = false;
    let level2Cleaned = false;

    const originalLevel1Cleanup = data.level1.cleanup;
    const originalLevel2Cleanup = data.level1.level2.cleanup;

    data.level1.cleanup = function () {
      level1Cleaned = true;
      originalLevel1Cleanup.call(this);
    };

    data.level1.level2.cleanup = function () {
      level2Cleaned = true;
      originalLevel2Cleanup.call(this);
    };

    data.cleanup();

    expect(level1Cleaned).toBe(true);
    expect(level2Cleaned).toBe(true);
  });

  test("readonly functionality", () => {
    const readonlyAll = store({ key: "value" }, { readonly: true });
    const readonlyPartial = store({
      title: "Book",
      year: 2023,
      rating: 4.5
    }, { readonly: ["title"] });

    expect(readonlyAll.key()).toBe("value");
    expect(readonlyAll.key.length).toBe(0);

    expect(readonlyPartial.title()).toBe("Book");
    readonlyPartial.year(2024);
    readonlyPartial.rating(5.0);

    expect(readonlyPartial.year()).toBe(2024);
    expect(readonlyPartial.rating()).toBe(5.0);
  });
});