import { effect, signal } from "../packages/core/dist/hella-core.esm";
import { describe, it, expect } from "bun:test";
import { tick } from "./tick.js";

describe("effect", () => {
  it("should run effect on signal change", async () => {
    const s = signal(1);
    let val = 0;
    effect(() => { val = s(); });
    expect(val).toBe(1);
    s(2);
    await tick();
    expect(val).toBe(2);
  });

  it("should cleanup effect", async () => {
    const s = signal(1);
    let val = 0;
    const cleanup = effect(() => { val = s(); });
    cleanup();
    s(3);
    await tick();
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
    s(2);
    await tick();
    expect(called).toBe(1);
  });
});
