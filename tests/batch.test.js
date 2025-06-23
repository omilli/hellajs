import { batch, signal, effect } from "../packages/core/dist/hella-core.esm";
import { describe, it, expect } from "bun:test";
import { tick } from "./tick.js";

describe("batch", () => {
  it("should batch updates and run effect once", async () => {
    const a = signal(1);
    const b = signal(2);
    let called = 0;
    effect(() => { a(); b(); called++; });
    batch(() => {
      a(10);
      b(20);
    });
    await tick();
    expect(called).toBe(2); // initial + batch
  });

  it("should reset flushing state if callback throws", () => {
    expect(() => {
      batch(() => {
        throw new Error("fail");
      });
    }).toThrow("fail");
    // If batch throws, it should not leave flushing state set
    expect(() => batch(() => { })).not.toThrow();
  });
});
