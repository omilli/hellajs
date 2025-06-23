import { describe, it, expect, beforeEach } from "bun:test";
import { signal } from "../packages/core/dist/hella-core.esm";
import { forEach, html, mount } from "../packages/dom/dist/hella-dom.esm";
import { tick } from "./tick.js";


beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
});

describe("forEach", () => {
  it("should render list and update", async () => {
    const items = signal([1, 2, 3]);
    const vnode = html.ul(forEach(items, (item) => html.li({ key: item }, `Item ${item}`)));
    mount(vnode);
    expect(document.querySelectorAll("li").length).toBe(3);
    items([2, 3, 4]);
    await tick();
    const texts = Array.from(document.querySelectorAll("li")).map(li => li.textContent);
    expect(texts).toEqual(["Item 2", "Item 3", "Item 4"]);
  });

  it("should clear list when array is empty", async () => {
    const items = signal([1, 2]);
    const vnode = html.ul(forEach(items, (item) => html.li({ key: item }, `Item ${item}`)));
    mount(vnode);
    expect(document.querySelectorAll("li").length).toBe(2);
    items([]);
    await tick();
    expect(document.querySelectorAll("li").length).toBe(0);
    // Placeholder should exist
    expect(document.querySelector("ul")?.childNodes.length).toBe(1);
    expect(document.querySelector("ul")?.childNodes[0].nodeType).toBe(Node.COMMENT_NODE);
  });

  it("should remove unused nodes when items are removed", async () => {
    const items = signal([1, 2, 3]);
    const vnode = html.ul(forEach(items, (item) => html.li({ key: item }, `Item ${item}`)));
    mount(vnode);
    expect(document.querySelectorAll("li").length).toBe(3);
    items([2, 3]);
    await tick();
    const texts = Array.from(document.querySelectorAll("li")).map(li => li.textContent);
    expect(texts).toEqual(["Item 2", "Item 3"]);
  });

  it("should reorder nodes when items are reordered", async () => {
    const items = signal([1, 2, 3]);
    const vnode = html.ul(forEach(items, (item) => html.li({ key: item }, `Item ${item}`)));
    mount(vnode);
    expect(document.querySelectorAll("li").length).toBe(3);
    items([3, 2, 1]);
    await tick();
    const texts = Array.from(document.querySelectorAll("li")).map(li => li.textContent);
    expect(texts).toEqual(["Item 3", "Item 2", "Item 1"]);
  });

  it("should support dynamic children (function)", async () => {
    const signals = [signal("A"), signal("B")];
    const vnode = html.span(
      forEach(signals, (item) => item)
    );
    mount(vnode);
    expect(document.querySelector("span")?.textContent).toBe("AB");
    signals[0]("B");
    await tick();
    expect(document.querySelector("span")?.textContent).toBe("BB");
  });

  it("should support string as key property", async () => {
    const items = signal([{ id: 1, name: "A" }, { id: 2, name: "B" }]);
    const vnode = html.ul(
      forEach(items, "id", (item) => html.li({ key: item.id }, item.name))
    );
    mount(vnode);
    expect(document.querySelectorAll("li").length).toBe(2);
    items([{ id: 2, name: "B" }, { id: 3, name: "C" }]);
    await tick();
    const texts = Array.from(document.querySelectorAll("li")).map(li => li.textContent);
    expect(texts).toEqual(["B", "C"]);
  });

  it("should use id property by default if present", async () => {
    const items = signal([{ id: 10, value: "foo" }, { id: 20, value: "bar" }]);
    const vnode = html.ul(
      forEach(items, (item) => html.li({ key: item.id }, item.value))
    );
    mount(vnode);
    expect(document.querySelectorAll("li").length).toBe(2);
    items([{ id: 20, value: "bar" }, { id: 30, value: "baz" }]);
    await tick();
    const texts = Array.from(document.querySelectorAll("li")).map(li => li.textContent);
    expect(texts).toEqual(["bar", "baz"]);
  });

  it("should use item value as key if no id property", async () => {
    const items = signal(["a", "b", "c"]);
    const vnode = html.ul(
      forEach(items, (item) => html.li({ key: item }, item))
    );
    mount(vnode);
    expect(document.querySelectorAll("li").length).toBe(3);
    items(["b", "c", "d"]);
    await tick();
    const texts = Array.from(document.querySelectorAll("li")).map(li => li.textContent);
    expect(texts).toEqual(["b", "c", "d"]);
  });

  it("should handle objects without id property", async () => {
    const items = signal([{ name: "x" }, { name: "y" }]);
    const vnode = html.ul(
      forEach(items, (item) => html.li({ key: item.name }, item.name))
    );
    mount(vnode);
    expect(document.querySelectorAll("li").length).toBe(2);
    items([{ name: "y" }, { name: "z" }]);
    await tick();
    const texts = Array.from(document.querySelectorAll("li")).map(li => li.textContent);
    expect(texts).toEqual(["y", "z"]);
  });

  it("should reorder nodes with non-trivial LIS (cover binary search in LIS)", async () => {
    const items = signal([1, 2, 3, 4, 5]);
    const vnode = html.ul(forEach(items, (item) => html.li({ key: item }, `Item ${item}`)));
    mount(vnode);
    expect(document.querySelectorAll("li").length).toBe(5);
    // This permutation will require the LIS binary search
    items([3, 1, 2, 5, 4]);
    await tick();
    const texts = Array.from(document.querySelectorAll("li")).map(li => li.textContent);
    expect(texts).toEqual(["Item 3", "Item 1", "Item 2", "Item 5", "Item 4"]);
  });
});
