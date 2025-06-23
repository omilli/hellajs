import { computed, signal } from "../packages/core/dist/hella-core.esm";
import { describe, it, expect } from "bun:test";
import { tick } from "./tick.js";

describe("computed", () => {
  it("should derive values and update reactively", async () => {
    const a = signal(2);
    const b = signal(3);
    const sum = computed(() => a() + b());
    expect(sum()).toBe(5);
    a(5);
    await tick();
    expect(sum()).toBe(8);
  });

  it("should not update if value is unchanged", async () => {
    const a = signal(1);
    let called = 0;
    const c = computed(() => { called++; return a(); });
    c();
    a(1);
    expect(called).toBe(1);
    a(2);
    await tick();
    expect(called).toBe(1);
    c()
    expect(called).toBe(2);
  });

  it("should work with nested signals", async () => {
    const a = signal(1);
    const b = signal(2);
    const c = computed(() => a() + b());
    expect(c()).toBe(3);
    a(3);
    b(4);
    await tick();
    expect(c()).toBe(7);
  });
});
