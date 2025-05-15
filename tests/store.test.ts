import { describe, it, expect } from "bun:test";
import { store } from "../lib/reactive";

describe("store", () => {
  it("should get and set deeply", () => {
    const user = store({ name: "Alice", age: 30, address: { city: "NYC" } });
    expect(user.name()).toBe("Alice");
    user.name.set("Bob");
    expect(user.name()).toBe("Bob");
    user.address.city.set("LA");
    expect(user.address.city()).toBe("LA");
  });

  it("should update partial and set full", () => {
    const user = store({ name: "A", age: 1, address: { city: "X" } });
    user.update({ age: 2, address: { city: "Y" } });
    expect(user.age()).toBe(2);
    expect(user.address.city()).toBe("Y");
    user.set({ name: "B", age: 3, address: { city: "Z" } });
    expect(user.name()).toBe("B");
    expect(user.address.city()).toBe("Z");
  });

  it("should compute full object", () => {
    const user = store({ name: "A", age: 1, address: { city: "X" } });
    expect(user.computed()).toEqual({ name: "A", age: 1, address: { city: "X" } });
    user.name.set("B");
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
    user.set({ name: "B", address: { city: "Y", zip: "789" } });
    expect(user.address.city()).toBe("Y");
    expect(user.address.zip()).toBe("789");
  });
});
