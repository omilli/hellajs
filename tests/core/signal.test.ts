import { describe, test, expect } from "bun:test";
import { signal } from '../../packages/core';

describe("signal", () => {
  test("create and read initial value", () => {
    const userCount = signal<number>(42);
    expect(userCount()).toBe(42);
  });

  test("update value and reflect changes immediately", () => {
    const temperature = signal<number>(20);
    expect(temperature()).toBe(20);

    temperature(25);
    expect(temperature()).toBe(25);

    temperature(-5);
    expect(temperature()).toBe(-5);
  });

  test("work with different data types", () => {
    const userName = signal<string>("Alice");
    expect(userName()).toBe("Alice");
    userName("Bob");
    expect(userName()).toBe("Bob");

    const isOnline = signal<boolean>(false);
    expect(isOnline()).toBe(false);
    isOnline(true);
    expect(isOnline()).toBe(true);

    interface UserData {
      id: number;
      name: string;
    }
    const userData = signal<UserData>({ id: 1, name: "John" });
    expect(userData()).toEqual({ id: 1, name: "John" });
    userData({ id: 2, name: "Jane" });
    expect(userData()).toEqual({ id: 2, name: "Jane" });
  });

  test("handles null and undefined values", () => {
    const nullableData = signal<string | null | undefined>(null);
    expect(nullableData()).toBe(null);

    nullableData(undefined);
    expect(nullableData()).toBeUndefined();

    nullableData("now has value"); ``
    expect(nullableData()).toBe("now has value");
  });
});
