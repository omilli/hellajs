import { effect, flushEffects, signal } from "../lib/reactive";
import { describe, it, expect } from "bun:test";

describe("effect", () => {
  it("should run effect on signal change", async () => {
    const s = signal(1);
    let val = 0;
    effect(() => { val = s(); });
    expect(val).toBe(1);
    s.set(2);
    await flushEffects();
    expect(val).toBe(2);
  });

  it("should cleanup effect", async () => {
    const s = signal(1);
    let val = 0;
    const cleanup = effect(() => { val = s(); });
    cleanup();
    s.set(3);
    await flushEffects();
    expect(val).toBe(1);
  });

  it("should cleanup effect on node removal", async () => {
    const s = signal(1);
    let called = 0;
    const div = document.createElement("div");
    document.body.append(div);
    const cleanup = effect(() => {
      s();
      called++;
    });
    cleanup();
    div.remove();
    s.set(2);
    await flushEffects();
    expect(called).toBe(1);
  });
});
