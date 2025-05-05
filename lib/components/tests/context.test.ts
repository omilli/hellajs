import { describe, it, expect } from "bun:test";
import { context, consume } from "../context";
import { setCurrentScope } from "../../reactive";
import type { Signal } from "../../reactive/signal";
import { ComponentContext } from "../component";

function makeComponentContext(contexts = new Map(), parent: any = undefined): ComponentContext {
  return {
    effects: new Set(),
    signals: new Set(),
    cleanup: () => { },
    isMounted: false,
    contexts,
    parent,
  };
}

describe("context", () => {
  it("creates a context with default value", () => {
    const ctx = context(123);
    expect(typeof ctx.id).toBe("symbol");
    expect(ctx.defaultValue).toBe(123);
  });

  it("returns default value if not provided", () => {
    const ctx = context("foo");
    setCurrentScope(makeComponentContext());
    expect(consume(ctx)).toBe("foo");
  });

  it("returns provided value from nearest context", () => {
    const ctx = context("bar");
    const parent = makeComponentContext(new Map([[ctx, "baz"]]));
    setCurrentScope(parent);
    expect(consume(ctx)).toBe("baz");
  });

  it("walks up parent chain to find context", () => {
    const ctx = context("x");
    const parent = makeComponentContext(new Map([[ctx, "y"]]));
    const child = makeComponentContext(new Map(), parent);
    setCurrentScope(child);
    expect(consume(ctx)).toBe("y");
  });

  it("throws if not in a component scope", () => {
    setCurrentScope(undefined as unknown as ComponentContext);
    const ctx = context(0);
    expect(() => consume(ctx)).toThrow();
  });
});
