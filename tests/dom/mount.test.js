import { describe, test, expect, beforeEach } from "bun:test";
import { mount, resolveNode } from "../../packages/dom/dist/dom.js";
import { signal } from "@hellajs/core";
import { tick } from "../tick.js";

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
});

describe("mount", () => {
  test("should mount vnode to #app", () => {
    mount({ tag: "div", props: { id: "test" }, children: ["hello"] });
    expect(document.querySelector("#test")?.textContent).toBe("hello");
  });

  test("should update on signal change", async () => {
    const count = signal(0);
    mount(() => ({ tag: "div", props: {}, children: [count] }));
    expect(document.querySelector("#app")?.textContent).toBe("0");
    count(5);
    await tick();
    expect(document.querySelector("#app")?.textContent).toBe("5");
  });

  test("should resolveNode for text, vnode, node", () => {
    expect(resolveNode("foo").textContent).toBe("foo");
    const vnode = { tag: "div", props: {}, children: ["bar"] };
    expect((resolveNode(vnode)).textContent).toBe("bar");
    const el = document.createElement("span");
    expect(resolveNode(el)).toBe(el);
  });

  test("should resolveNode fallback to comment for null/undefined", () => {
    const node1 = resolveNode(undefined);
    const node2 = resolveNode(null);
    expect(node1.nodeType).toBe(Node.COMMENT_NODE);
    expect(node2.nodeType).toBe(Node.COMMENT_NODE);
  });

  test("should mount text, vnode, and DOM node children", async () => {
    const el = document.createElement("span");
    const vnode = { tag: "div", props: { id: "foo" }, children: ["foo", { tag: "span", props: {}, children: ["bar"] }, el] };
    mount(vnode);
    const div = document.querySelector("#foo");
    expect(div?.childNodes[0].textContent).toBe("foo");
    expect(div?.childNodes[1].nodeName).toBe("SPAN");
    expect(div?.childNodes[2]).toBe(el);
  });

  test("should mount function child that returns text", () => {
    mount({ tag: "div", props: {}, children: [() => "dynamic text"] });
    expect(document.querySelector("div")?.textContent).toBe("dynamic text");
  });

  test("should mount function child that returns vnode", () => {
    mount({ tag: "div", props: {}, children: [() => ({ tag: "span", props: {}, children: ["dynamic vnode"] })] });
    expect(document.querySelector("span")?.textContent).toBe("dynamic vnode");
  });

  test("should set standard DOM properties and attributes", () => {
    mount({ tag: "input", props: { value: "foo", type: "text", custom: "bar" }, children: [] });
    const input = document.querySelector("input");
    expect(input?.value).toBe("foo");
    expect(input?.getAttribute("type")).toBe("text");
    expect(input?.getAttribute("custom")).toBe("bar");
  });

  test("should update dynamic DOM properties and attributes", async () => {
    const fooClass = signal("foo");
    mount({ tag: "input", props: { class: fooClass }, children: [] });
    const input = document.querySelector("input");
    expect(input?.className).toBe("foo");
    fooClass("bar");
    await tick();
    expect(input?.className).toBe("bar");
  });

  test("should attach event handlers", () => {
    let called = false;
    mount({ tag: "input", props: { onblur: () => { called = true; } }, children: [] });
    const input = document.querySelector("input");
    input?.dispatchEvent(new Event("blur"));
    expect(called).toBe(true);
  });

  test("should render fragment ($) with multiple children", () => {
    mount({
      tag: "div",
      props: { id: "fragment" },
      children: [
        {
          tag: "$",
          props: {},
          children: [
            { tag: "span", props: {}, children: ["a"] },
            { tag: "span", props: {}, children: ["b"] },
            { tag: "span", props: {}, children: ["c"] }
          ]
        }
      ]
    });
    const div = document.getElementById("fragment");
    expect(div?.children.length).toBe(3);
    expect(div?.children[0].textContent).toBe("a");
    expect(div?.children[1].textContent).toBe("b");
    expect(div?.children[2].textContent).toBe("c");
  });

  test("should handle function child with arity 1", () => {
    let called = false;
    let receivedParent = null;
    mount({
      tag: "div",
      props: {},
      children: [
        (parent) => {
          called = true;
          receivedParent = parent;
          parent.textContent = "foo";
        }
      ]
    });
    expect(called).toBe(true);
    expect(receivedParent).toBeTruthy();
    expect(document.querySelector("div")?.textContent).toBe("foo");
  });
});
