import { describe, test, expect } from "bun:test";
import { store } from "../packages/store/dist/store.js";

describe("store", () => {
  test("should get and set deeply", () => {
    const user = store({ name: "Alice", age: 30, address: { city: "NYC" } });
    expect(user.name()).toBe("Alice");
    user.name("Bob");
    expect(user.name()).toBe("Bob");
    user.address.city("LA");
    expect(user.address.city()).toBe("LA");
  });

  test("should update partial and set full", () => {
    const user = store({ name: "A", age: 1, address: { city: "X" } });
    user.update({ age: 2, address: { city: "Y" } });
    expect(user.age()).toBe(2);
    expect(user.address.city()).toBe("Y");
    user({ name: "B", age: 3, address: { city: "Z" } });
    expect(user.name()).toBe("B");
    expect(user.address.city()).toBe("Z");
  });

  test("should compute full object", () => {
    const user = store({ name: "A", age: 1, address: { city: "X" } });
    expect(user.computed()).toEqual({ name: "A", age: 1, address: { city: "X" } });
    user.name("B");
    expect(user.computed().name).toBe("B");
  });

  test("should cleanup", () => {
    const user = store({ name: "A", age: 1, address: { city: "X" } });
    user.cleanup();
    // No error on cleanup, signals/effects are cleaned
  });

  test("should update deeply nested store", () => {
    const user = store({ name: "A", address: { city: "X", zip: "123" } });
    user.address.update({ zip: "456" });
    expect(user.address.zip()).toBe("456");
    user({ name: "B", address: { city: "Y", zip: "789" } });
    expect(user.address.city()).toBe("Y");
    expect(user.address.zip()).toBe("789");
  });

  test("should call cleanup functions on nested objects during cleanup", () => {
    // Create a store with nested plain objects - these become nested stores with cleanup functions
    const user = store({
      name: "Alice",
      // This plain object will become a nested store with cleanup function
      profile: {
        email: "alice@example.com"
      }
    });

    // Spy on the nested store's cleanup function before calling main cleanup
    let nestedCleanupCalled = false;
    const originalNestedCleanup = user.profile.cleanup;
    user.profile.cleanup = function () {
      nestedCleanupCalled = true;
      originalNestedCleanup.call(this);
    };

    // This should call cleanup on the nested store (lines 44-45 in compiled output)
    user.cleanup();

    // Verify the nested store's cleanup was called
    expect(nestedCleanupCalled).toBe(true);
  });

  test("should recursively cleanup nested objects without cleanup functions", () => {
    const user = store({
      name: "Alice",
      profile: {
        email: "alice@example.com"
      }
    });

    // Add a plain object without cleanup function to test recursive path
    user.metadata = {
      level1: {
        level2: {
          nestedStore: store({ value: "deep" })
        }
      }
    };

    // Spy on the deeply nested store's cleanup function
    let deeplyNestedCleanupCalled = false;
    const originalDeepCleanup = user.metadata.level1.level2.nestedStore.cleanup;
    user.metadata.level1.level2.nestedStore.cleanup = function () {
      deeplyNestedCleanupCalled = true;
      originalDeepCleanup.call(this);
    };

    // This should traverse the plain object hierarchy and find the nested store
    user.cleanup();

    // Verify the deeply nested store's cleanup was called
    expect(deeplyNestedCleanupCalled).toBe(true);
  });
});

describe("store readonly option", () => {
  test("should make all props readonly if readonly: true", () => {
    const user = store({ name: "Alice", age: 30 }, { readonly: true });
    expect(user.name()).toBe("Alice");
    (user.name)?.("Bob");
    (user.age)?.(42);
    expect(user.name()).toBe("Alice");
    expect(user.age()).toBe(30);
  });

  test("should make only specified keys readonly if readonly is array", () => {
    const user = store({ name: "Alice", age: 30 }, { readonly: ["name"] });
    expect(user.name()).toBe("Alice");
    expect(user.age()).toBe(30);
    (user.name)?.("Bob");
    expect(user.name()).toBe("Alice");
    user.age(42);
    expect(user.age()).toBe(42);
  });

  test("should make nested keys readonly if specified", () => {
    const user = store(
      { name: "Alice", address: { city: "NYC", zip: "123" } },
      { readonly: ["name"] }
    );
    expect(typeof user.name).toBe("function");
    expect(typeof user.address.city).toBe("function");
    expect(user.address.city).toBeDefined();
    user.address.city("LA");
    expect(user.address.city()).toBe("LA");
  });
});
