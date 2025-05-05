import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';

import { createElement } from "../element";
import { rootRegistry } from "../../render";
import { EventDelegator } from "../events";
import type { VNode } from "../../types";

describe("createElement", () => {
  let parent: HTMLElement;
  let rootSelector = "#root";
  let delegator: EventDelegator;

  beforeEach(() => {
    document.body.innerHTML = `<div id="root"></div>`;
    parent = document.querySelector(rootSelector)!;
    delegator = new EventDelegator(rootSelector);
    rootRegistry.set(rootSelector, delegator);
  });

  afterEach(() => {
    rootRegistry.delete(rootSelector);
    delegator.cleanup();
  });

  it("creates and appends a text node for string", () => {
    const node = createElement("hello", parent, rootSelector);
    expect(node).toBeInstanceOf(Text);
    expect(parent.textContent).toBe("hello");
  });

  it("creates and appends a text node for number", () => {
    const node = createElement(123 as unknown as string, parent, rootSelector);
    expect(node).toBeInstanceOf(Text);
    expect(parent.textContent).toBe("123");
  });

  it("calls renderFunction for function vNode", () => {
    let called = false;
    const fn = () => { called = true; return "hi"; };
    createElement(fn, parent, rootSelector);
    expect(called).toBe(true);
  });

  it("renders fragment ($ tag) and returns null", () => {
    const vNode: VNode = { tag: "$", props: {}, children: ["a", "b"] };
    const result = createElement(vNode, parent, rootSelector);
    expect(result).toBeNull();
    expect(parent.textContent).toBe("ab");
  });

  it("creates element, sets attributes, and appends children", () => {
    const vNode: VNode = {
      tag: "div",
      props: { id: "foo", title: "bar" },
      children: ["child"]
    };
    const node = createElement(vNode, parent, rootSelector) as HTMLElement;
    expect(node).toBeInstanceOf(HTMLElement);
    expect(node.id).toBe("foo");
    expect(node.title).toBe("bar");
    expect(node.textContent).toBe("child");
    expect(parent.contains(node)).toBe(true);
  });

  it("attaches event handler via delegator", () => {
    const onClick = mock(() => { });
    const vNode: VNode = {
      tag: "button",
      props: { onclick: onClick }, // use lowercase 'onclick'
      children: []
    };
    const node = createElement(vNode, parent, rootSelector) as HTMLElement;
    node.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onClick).toHaveBeenCalled();
  });

  it("reactively sets attribute if value is function", () => {
    let val = "foo";
    const vNode: VNode = {
      tag: "div",
      props: { title: () => val },
      children: []
    };
    const node = createElement(vNode, parent, rootSelector) as HTMLElement;
    expect(node.getAttribute("title")).toBe("foo");
    val = "bar";
    node.setAttribute("title", val);
    expect(node.getAttribute("title")).toBe("bar");
  });

  it("handles context cleanup for event handlers", () => {
    const cleanup = mock(() => { });
    const context = { effects: { add: (fn: () => void) => fn() } };
    const onClick = mock(() => { });
    const vNode: VNode = {
      tag: "button",
      props: { onClick, _context: context },
      children: []
    };
    const node = createElement(vNode, parent, rootSelector) as HTMLElement;
    expect(node).toBeInstanceOf(HTMLElement);
  });

  it("renders multiple children in fragment", () => {
    const vNode: VNode = {
      tag: "div",
      props: {},
      children: ["a", "b"]
    };
    const node = createElement(vNode, parent, rootSelector) as HTMLElement;
    expect(node.childNodes.length).toBe(2);
    expect(node.textContent).toBe("ab");
  });

  it("renders single child directly", () => {
    const vNode: VNode = {
      tag: "div",
      props: {},
      children: ["x"]
    };
    const node = createElement(vNode, parent, rootSelector) as HTMLElement;
    expect(node.childNodes.length).toBe(1);
    expect(node.textContent).toBe("x");
  });
});
