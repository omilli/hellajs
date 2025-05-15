import { describe, it, expect } from "bun:test";
import { signal, flushEffects } from "../lib/reactive";

describe("signal", () => {
  it("should get and set values", () => {
    const count = signal(0);
    expect(count()).toBe(0);
    count.set(5);
    expect(count()).toBe(5);
  });

  it("should notify subscribers", async () => {
    const s = signal(1);
    let called = 0;
    const unsub = s.subscribe(() => { called++; });
    s.set(2);
    await flushEffects();
    expect(called).toBe(1);
    unsub();
    s.set(3);
    await flushEffects();
    expect(called).toBe(1);
  });

  it("should cleanup subscribers", () => {
    const s = signal(1);
    let called = 0;
    s.subscribe(() => { called++; });
    s.cleanup();
    s.set(2);
    expect(called).toBe(0);
  });

  it("should unsubscribe correctly", () => {
    const s = signal(1);
    let called = 0;
    const fn = () => { called++; };
    s.subscribe(fn);
    s.unsubscribe(fn);
    s.set(2);
    expect(called).toBe(0);
  });
});
