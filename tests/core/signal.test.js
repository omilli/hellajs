import { describe, test, expect } from "bun:test";
import { signal } from '../../packages/core/dist/core.js';

describe("signal", () => {
  test("should create and read initial value", () => {
    const userCount = signal(42);
    expect(userCount()).toBe(42);
  });

  test("should update value and reflect changes immediately", () => {
    const temperature = signal(20);
    expect(temperature()).toBe(20);

    temperature(25);
    expect(temperature()).toBe(25);

    temperature(-5);
    expect(temperature()).toBe(-5);
  });

  test("should work with different data types", () => {
    const userName = signal("Alice");
    expect(userName()).toBe("Alice");
    userName("Bob");
    expect(userName()).toBe("Bob");

    const isOnline = signal(false);
    expect(isOnline()).toBe(false);
    isOnline(true);
    expect(isOnline()).toBe(true);

    const userData = signal({ id: 1, name: "John" });
    expect(userData()).toEqual({ id: 1, name: "John" });
    userData({ id: 2, name: "Jane" });
    expect(userData()).toEqual({ id: 2, name: "Jane" });
  });

  test("should handle null and undefined values", () => {
    const nullableData = signal(null);
    expect(nullableData()).toBe(null);

    nullableData(undefined);
    expect(nullableData()).toBe(undefined);

    nullableData("now has value");
    expect(nullableData()).toBe("now has value");
  });
});
