import { describe, it, expect } from "bun:test";
import { Component } from "../component";

describe("Component", () => {
  it("wraps render function and sets context", () => {
    let called = false;
    const render = () => {
      called = true;
      return { tag: "div", props: {}, children: [] };
    };
    const Comp = Component(render);
    const vnode = Comp();
    expect(called).toBe(true);
    expect(vnode.props._context).toBeDefined();
  });

  it("calls onMount once", () => {
    let called = 0;
    const fn = () => { called++; };
    const Comp = Component(() => ({ tag: "div", props: {}, children: [] }));
    Comp.onMount = fn;
    Comp();
    expect(called).toBe(1);
  });

  it("calls onUpdate on rerender", () => {
    let called = 0;
    const fn = () => { called++; };
    const Comp = Component(() => ({ tag: "div", props: {}, children: [] }));
    Comp.onUpdate = fn;
    // simulate mount
    Comp();
    // simulate update
    Comp();
    expect(called).toBe(1);
  });

  it("calls onUnmount on cleanup", () => {
    let called = false;
    const Comp = Component(() => ({ tag: "div", props: {}, children: [] }));
    Comp.onUnmount = () => { called = true; };
    // @ts-ignore
    Comp().props._context.cleanup();
    expect(called).toBe(true);
  });
});
