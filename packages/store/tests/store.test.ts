import { describe, test, expect } from "bun:test";
import { store } from "@hellajs/store/bundle";

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

  test("snapshot method returns snapshots", () => {
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

  test("nested stores - stores as values", () => {
    const userStore = store({
      name: "John Doe",
      email: "john@example.com",
      preferences: {
        theme: "dark",
        language: "en"
      }
    });

    const uiStore = store({
      sidebarOpen: false,
      activeTab: "dashboard"
    });

    const appStore = store({
      user: userStore,
      ui: uiStore
    });

    expect(appStore.user.name()).toBe("John Doe");
    expect(appStore.user.email()).toBe("john@example.com");
    expect(appStore.user.preferences.theme()).toBe("dark");
    expect(appStore.ui.sidebarOpen()).toBe(false);
    expect(appStore.ui.activeTab()).toBe("dashboard");

    appStore.user.name("Jane Doe");
    appStore.user.preferences.theme("light");
    appStore.ui.sidebarOpen(true);

    expect(appStore.user.name()).toBe("Jane Doe");
    expect(appStore.user.preferences.theme()).toBe("light");
    expect(appStore.ui.sidebarOpen()).toBe(true);

    expect(userStore.name()).toBe("Jane Doe");
    expect(uiStore.sidebarOpen()).toBe(true);

    userStore.email("jane@example.com");
    expect(appStore.user.email()).toBe("jane@example.com");
  });
});

describe("update with mutator function", () => {
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

  test("only applies changed properties", () => {
    const data = store({
      a: 1,
      b: 2,
      c: 3
    });

    let aUpdates = 0;
    let bUpdates = 0;

    effect(() => {
      data.a();
      aUpdates++;
    });

    effect(() => {
      data.b();
      bUpdates++;
    });

    data.update(draft => {
      draft.a = 1; // Same value
      draft.b = 20; // Changed
      // c not touched
    });

    expect(data.a()).toBe(1);
    expect(data.b()).toBe(20);
    expect(data.c()).toBe(3);
    expect(aUpdates).toBe(1); // No update triggered
    expect(bUpdates).toBe(2); // Update triggered
  });

  test("unchanged arrays do not trigger updates", () => {
    const data = store({
      items: [1, 2, 3],
      count: 0
    });

    let itemsUpdates = 0;
    let countUpdates = 0;

    effect(() => {
      data.items();
      itemsUpdates++;
    });

    effect(() => {
      data.count();
      countUpdates++;
    });

    data.update(draft => {
      draft.items[0]; // Access but don't modify
      draft.count = 10; // Only change count
    });

    expect(data.items()).toEqual([1, 2, 3]);
    expect(data.count()).toBe(10);
    expect(itemsUpdates).toBe(1); // No update - array unchanged
    expect(countUpdates).toBe(2); // Update triggered
  });

  test("changes primitive to object in draft", () => {
    const data = store<{
      payload: string | { nested: boolean; value: string };
      other: number;
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
});

describe("middleware", () => {
  test("transforms values on set", () => {
    const data = store({
      name: "",
      email: ""
    }, {
      middleware: {
        name: (v: string) => v.trim(),
        email: (v: string) => v.toLowerCase()
      }
    });

    data.name("  John  ");
    data.email("JOHN@EXAMPLE.COM");

    expect(data.name()).toBe("John");
    expect(data.email()).toBe("john@example.com");
  });

  test("validates and rejects invalid values", () => {
    const data = store({
      age: 0
    }, {
      middleware: {
        age: (v: number) => {
          if (v < 0) throw new Error("Age cannot be negative");
          return v;
        }
      }
    });

    expect(() => data.age(-5)).toThrow("Age cannot be negative");
    expect(data.age()).toBe(0);

    data.age(25);
    expect(data.age()).toBe(25);
  });

  test("works with update method", () => {
    const data = store({
      name: "",
      email: "",
      age: 0
    }, {
      middleware: {
        name: (v: string) => v.trim(),
        email: (v: string) => v.toLowerCase(),
        age: (v: number) => Math.max(0, v)
      }
    });

    data.update({
      name: "  Jane  ",
      email: "JANE@EXAMPLE.COM",
      age: 30
    });

    expect(data.name()).toBe("Jane");
    expect(data.email()).toBe("jane@example.com");
    expect(data.age()).toBe(30);
  });

  test("works with nested stores", () => {
    const data = store({
      user: {
        name: "",
        email: ""
      }
    }, {
      middleware: {
        user: {
          name: (v: string) => v.trim(),
          email: (v: string) => v.toLowerCase()
        }
      }
    });

    data.user.name("  John  ");
    data.user.email("JOHN@EXAMPLE.COM");

    expect(data.user.name()).toBe("John");
    expect(data.user.email()).toBe("john@example.com");
  });

  test("middleware only applied for defined keys", () => {
    const data = store({
      a: "hello",
      b: "world"
    }, {
      middleware: {
        a: (v: string) => v.toUpperCase()
      }
    });

    data.a("test");
    data.b("test");

    expect(data.a()).toBe("TEST");
    expect(data.b()).toBe("test");
  });

});

describe("edge cases", () => {
  test("empty store", () => {
    const data = store({});
    expect(typeof data.snapshot).toBe("function");
    expect(typeof data.update).toBe("function");
    expect(typeof data.cleanup).toBe("function");
    expect(data.snapshot()).toEqual({});
  });

  test("update() silently ignores keys absent from initial object", () => {
    const data = store({ a: 1, b: 2 });

    data.update({ a: 10, c: 99 } as never);

    expect(data.a()).toBe(10);
    expect(data.b()).toBe(2);
    expect("c" in data).toBe(false);
  });

  test("readonly properties are not updated via update()", () => {
    const data = store({ locked: "original", writable: "a" }, { readonly: ["locked"] });

    data.update({ locked: "new", writable: "b" } as never);

    expect(data.locked()).toBe("original");
    expect(data.writable()).toBe("b");
  });

  test("snapshot() is reactive — effect re-runs on property change", () => {
    const data = store({ name: "Alice", age: 30 });
    let runs = 0;
    let lastSnapshot: { name: string; age: number } | null = null;

    effect(() => {
      lastSnapshot = data.snapshot() as { name: string; age: number };
      runs++;
    });

    expect(runs).toBe(1);
    expect(lastSnapshot!.name).toBe("Alice");

    data.name("Bob");

    expect(runs).toBe(2);
    expect(lastSnapshot!.name).toBe("Bob");
  });

  test("cleanup() is safe to call and signals remain usable", () => {
    const data = store({ count: 0, nested: { value: "a" } });

    // Should not throw
    data.cleanup();

    // Signals still work after cleanup (cleanup disposes nested stores only)
    data.count(99);
    expect(data.count()).toBe(99);
  });

  test("middleware applies via update(draft => ...) path", () => {
    const data = store({ name: "", score: 0 }, {
      middleware: {
        name: (v: string) => v.trim(),
        score: (v: number) => Math.max(0, v)
      }
    });

    data.update(draft => {
      draft.name = "  Jane  ";
      draft.score = -10;
    });

    expect(data.name()).toBe("Jane");
    expect(data.score()).toBe(0);
  });
});
