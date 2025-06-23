import { describe, it, expect } from "bun:test";
import { signal } from "../packages/core/dist/hella-core.esm";
import { tick } from "./tick.js";

describe("signal", () => {
  it("should get and set values", () => {
    const count = signal(0);
    expect(count()).toBe(0);
    count(5);
    expect(count()).toBe(5);
    count(10);
    expect(count()).toBe(10);
  });
});
