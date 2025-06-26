import { describe, test, expect } from "bun:test";
import { signal } from "@hellajs/core";
import { tick } from "../tick.js";

describe("signal", () => {
  test("should get and set values", () => {
    const count = signal(0);
    expect(count()).toBe(0);
    count(5);
    expect(count()).toBe(5);
    count(10);
    expect(count()).toBe(10);
  });
});
