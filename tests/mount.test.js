import { describe, it, expect, beforeEach } from "bun:test";
import { mount, resolveNode, html } from "../packages/dom/dist/hella-dom.esm";
import { signal, flushEffects } from "../packages/core/dist/hella-core.esm";

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
});

describe("mount", () => {
  it("should mount vnode to #app", () => {
    mount(html.div({ id: "test" }, "hello"));
    expect(document.querySelector("#test")?.textContent).toBe("hello");
  });

  it("should update on signal change", async () => {
    const count = signal(0);
    mount(() => html.div(count));
    expect(document.querySelector("#app")?.textContent).toBe("0");
    count.set(5);
    await flushEffects();
    expect(document.querySelector("#app")?.textContent).toBe("5");
  });

  it("should resolveNode for text, vnode, node", () => {
    expect(resolveNode("foo").textContent).toBe("foo");
    const vnode = html.div("bar");
    expect((resolveNode(vnode)).textContent).toBe("bar");
    const el = document.createElement("span");
    expect(resolveNode(el)).toBe(el);
  });

  it("should resolveNode fallback to comment for null/undefined", () => {
    const node1 = resolveNode(undefined);
    const node2 = resolveNode(null);
    expect(node1.nodeType).toBe(Node.COMMENT_NODE);
    expect(node2.nodeType).toBe(Node.COMMENT_NODE);
  });

  it("should mount text, vnode, and DOM node children", async () => {
    const el = document.createElement("span");
    const vnode = html.div({ id: "foo" }, "foo", html.span("bar"), el);
    mount(vnode);
    const div = document.querySelector("#foo");
    expect(div?.childNodes[0].textContent).toBe("foo");
    expect(div?.childNodes[1].nodeName).toBe("SPAN");
    expect(div?.childNodes[2]).toBe(el);
  });

  it("should mount function child that returns text", () => {
    mount(html.div(() => "dynamic text"));
    expect(document.querySelector("div")?.textContent).toBe("dynamic text");
  });

  it("should mount function child that returns vnode", () => {
    mount(html.div(() => html.span("dynamic vnode")));
    expect(document.querySelector("span")?.textContent).toBe("dynamic vnode");
  });

  it("should handle function child with arity 1", () => {
    let called = false;
    mount(html.div((el) => { called = true; el.textContent = "foo"; }));
    expect(called).toBe(true);
    expect(document.querySelector("div")?.textContent).toBe("foo");
  });

  it("should set standard DOM properties and attributes", () => {
    mount(html.input({ value: "foo", type: "text", custom: "bar" }));
    const input = document.querySelector("input");
    expect(input?.value).toBe("foo");
    expect(input?.getAttribute("type")).toBe("text");
    expect(input?.getAttribute("custom")).toBe("bar");
  });

  it("should update dynamic DOM properties and attributes", async () => {
    const fooClass = signal("foo");
    mount(html.input({ class: fooClass }));
    const input = document.querySelector("input");
    expect(input?.className).toBe("foo");
    fooClass.set("bar");
    await flushEffects();
    expect(input?.className).toBe("bar");
  });

  it("should attach event handlers", () => {
    let called = false;
    mount(html.input({ onblur: () => { called = true; } }));
    const input = document.querySelector("input");
    input?.dispatchEvent(new Event("blur"));
    expect(called).toBe(true);
  });

  it("should mount raw HTML strings", () => {
    const rawHtmlContent = '<div class="test"><p>Raw HTML content</p><span>nested</span></div>';
    mount(html.div({ html: rawHtmlContent }));

    expect(document.querySelector("#app div .test")).toBeTruthy();
    expect(document.querySelector("#app div .test p")?.textContent).toBe("Raw HTML content");
    expect(document.querySelector("#app div .test span")?.textContent).toBe("nested");
  });

  it("should output dynamic HTML strings", async () => {
    const rawHtmlContent = signal('');
    mount(html.div({ html: rawHtmlContent }));
    rawHtmlContent.set('<div class="test"><p>Raw HTML content</p><span>nested</span></div>');
    await flushEffects();
    expect(document.querySelector("#app div .test")).toBeTruthy();
    expect(document.querySelector("#app div .test p")?.textContent).toBe("Raw HTML content");
    expect(document.querySelector("#app div .test span")?.textContent).toBe("nested");
  });
});
