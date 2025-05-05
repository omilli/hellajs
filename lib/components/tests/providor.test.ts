import { describe, it, expect } from "bun:test";
import { Provider } from "../providor";
import { context } from "../context";
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

describe("Provider", () => {
  it("sets context value in scope", () => {
    const ctx = context("foo");
    const scope = makeComponentContext();
    setCurrentScope(scope);
    const vnode = Provider({ context: ctx, value: "bar", children: ["child"] });
    expect(scope.contexts.get(ctx)).toBe("bar");
    expect(vnode.children).toEqual(["child"]);
    expect(vnode.tag).toBe("$");
  });

  it("throws if not in component scope", () => {
    setCurrentScope(undefined as unknown as ComponentContext);
    const ctx = context(0);
    expect(() =>
      Provider({ context: ctx, value: 1, children: [] })
    ).toThrow();
  });
});
