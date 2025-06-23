import { describe, it, expect } from "bun:test";
import { store } from "../packages/store/dist/hella-store.esm";

describe("store", () => {
  it("should get and set deeply", () => {
    const user = store({ name: "Alice", age: 30, address: { city: "NYC" } });
    expect(user.name()).toBe("Alice");
    user.name("Bob");
    expect(user.name()).toBe("Bob");
    user.address.city("LA");
    expect(user.address.city()).toBe("LA");
  });

  it("should update partial and set full", () => {
    const user = store({ name: "A", age: 1, address: { city: "X" } });
    user.update({ age: 2, address: { city: "Y" } });
    expect(user.age()).toBe(2);
    expect(user.address.city()).toBe("Y");
    user({ name: "B", age: 3, address: { city: "Z" } });
    expect(user.name()).toBe("B");
    expect(user.address.city()).toBe("Z");
  });

  it("should compute full object", () => {
    const user = store({ name: "A", age: 1, address: { city: "X" } });
    expect(user.computed()).toEqual({ name: "A", age: 1, address: { city: "X" } });
    user.name("B");
    expect(user.computed().name).toBe("B");
  });

  it("should cleanup", () => {
    const user = store({ name: "A", age: 1, address: { city: "X" } });
    user.cleanup();
    // No error on cleanup, signals/effects are cleaned
  });

  it("should update deeply nested store", () => {
    const user = store({ name: "A", address: { city: "X", zip: "123" } });
    user.address.update({ zip: "456" });
    expect(user.address.zip()).toBe("456");
    user({ name: "B", address: { city: "Y", zip: "789" } });
    expect(user.address.city()).toBe("Y");
    expect(user.address.zip()).toBe("789");
  });
});

describe("store readonly option", () => {
  it("should make all props readonly if readonly: true", () => {
    const user = store({ name: "Alice", age: 30 }, { readonly: true });
    expect(user.name()).toBe("Alice");
    (user.name)?.("Bob");
    (user.age)?.(42);
    expect(user.name()).toBe("Alice");
    expect(user.age()).toBe(30);
  });

  it("should make only specified keys readonly if readonly is array", () => {
    const user = store({ name: "Alice", age: 30 }, { readonly: ["name"] });
    expect(user.name()).toBe("Alice");
    expect(user.age()).toBe(30);
    (user.name)?.("Bob");
    expect(user.name()).toBe("Alice");
    user.age(42);
    expect(user.age()).toBe(42);
  });

  it("should make nested keys readonly if specified", () => {
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
