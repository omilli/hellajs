import { describe, test, expect, beforeEach } from "bun:test";
import { mount, resolveNode, html } from "../../packages/dom/dist/hella-dom.esm.js";
import { signal } from "@hellajs/core";
import { tick } from "../tick.js";

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
});

describe("mount", () => {
  test("should mount vnode to #app", () => {
    mount(html.div({ id: "test" }, "hello"));
    expect(document.querySelector("#test")?.textContent).toBe("hello");
  });

  test("should update on signal change", async () => {
    const count = signal(0);
    mount(() => html.div(count));
    expect(document.querySelector("#app")?.textContent).toBe("0");
    count(5);
    await tick();
    expect(document.querySelector("#app")?.textContent).toBe("5");
  });

  test("should resolveNode for text, vnode, node", () => {
    expect(resolveNode("foo").textContent).toBe("foo");
    const vnode = html.div("bar");
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
    const vnode = html.div({ id: "foo" }, "foo", html.span("bar"), el);
    mount(vnode);
    const div = document.querySelector("#foo");
    expect(div?.childNodes[0].textContent).toBe("foo");
    expect(div?.childNodes[1].nodeName).toBe("SPAN");
    expect(div?.childNodes[2]).toBe(el);
  });

  test("should mount function child that returns text", () => {
    mount(html.div(() => "dynamic text"));
    expect(document.querySelector("div")?.textContent).toBe("dynamic text");
  });

  test("should mount function child that returns vnode", () => {
    mount(html.div(() => html.span("dynamic vnode")));
    expect(document.querySelector("span")?.textContent).toBe("dynamic vnode");
  });

  test("should set standard DOM properties and attributes", () => {
    mount(html.input({ value: "foo", type: "text", custom: "bar" }));
    const input = document.querySelector("input");
    expect(input?.value).toBe("foo");
    expect(input?.getAttribute("type")).toBe("text");
    expect(input?.getAttribute("custom")).toBe("bar");
  });

  test("should update dynamic DOM properties and attributes", async () => {
    const fooClass = signal("foo");
    mount(html.input({ class: fooClass }));
    const input = document.querySelector("input");
    expect(input?.className).toBe("foo");
    fooClass("bar");
    await tick();
    expect(input?.className).toBe("bar");
  });

  test("should attach event handlers", () => {
    let called = false;
    mount(html.input({ onblur: () => { called = true; } }));
    const input = document.querySelector("input");
    input?.dispatchEvent(new Event("blur"));
    expect(called).toBe(true);
  });

  test("should mount raw HTML strings", () => {
    const rawHtmlContent = '<div class="test"><p>Raw HTML content</p><span>nested</span></div>';
    mount(html.div({ html: rawHtmlContent }));

    expect(document.querySelector("#app div .test")).toBeTruthy();
    expect(document.querySelector("#app div .test p")?.textContent).toBe("Raw HTML content");
    expect(document.querySelector("#app div .test span")?.textContent).toBe("nested");
  });

  test("should output dynamic HTML strings", async () => {
    const rawHtmlContent = signal('');
    mount(html.div({ html: rawHtmlContent }));
    rawHtmlContent('<div class="test"><p>Raw HTML content</p><span>nested</span></div>');
    await tick();
    expect(document.querySelector("#app div .test")).toBeTruthy();
    expect(document.querySelector("#app div .test p")?.textContent).toBe("Raw HTML content");
    expect(document.querySelector("#app div .test span")?.textContent).toBe("nested");
  });

  test("should render fragment ($) with multiple children", () => {
    mount(html.div({ id: "fragment" },
      html.$(
        html.span("a"),
        html.span("b"),
        html.span("c")
      )
    ));
    const div = document.getElementById("fragment");
    expect(div?.children.length).toBe(3);
    expect(div?.children[0].textContent).toBe("a");
    expect(div?.children[1].textContent).toBe("b");
    expect(div?.children[2].textContent).toBe("c");
  });

  test("should handle function child with arity 1", () => {
    let called = false;
    let receivedParent = null;
    mount(html.div((parent) => {
      called = true;
      receivedParent = parent;
      parent.textContent = "foo";
    }));
    expect(called).toBe(true);
    expect(receivedParent).toBeTruthy();
    expect(document.querySelector("div")?.textContent).toBe("foo");
  });

  test("should handle raw HTML objects in children", () => {
    // Test raw HTML as a direct child value, not mixed with other VNodes
    mount(html.div({ html: "before" }, { html: "<strong>raw html</strong>" }, { html: "after" }));
    const div = document.querySelector("div");
    console.log("div structure:", div?.innerHTML);

    // The first child should be the content from the html prop of the div itself
    // Additional { html: ... } objects as children should be appended
    expect(div?.innerHTML.includes("<strong>raw html</strong>")).toBe(true);
    expect(div?.innerHTML.includes("before")).toBe(true);
    expect(div?.innerHTML.includes("after")).toBe(true);
  });
});
