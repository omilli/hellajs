import { describe, test, expect, beforeEach } from "bun:test";
import { signal } from "../../packages/core";
import { forEach, mount } from "../../packages/dom";
import { tick } from "../utils/tick.js";

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
});

describe("dom (forEach)", () => {
  test("should render list and update", async () => {
    const items = signal<number[]>([1, 2, 3]);
    const vnode = { tag: "ul", props: {}, children: [forEach(items, (item) => ({ tag: "li", props: { key: item }, children: [`Item ${item}`] }))] };
    mount(vnode);
    expect(document.querySelectorAll("li").length).toBe(3);
    items([2, 3, 4]);
    await tick();
    const texts = Array.from(document.querySelectorAll("li")).map(li => li.textContent);
    expect(texts).toEqual(["Item 2", "Item 3", "Item 4"]);
  });

  test("should clear list when array is empty", async () => {
    const items = signal<number[]>([1, 2]);
    const vnode = { tag: "ul", props: {}, children: [forEach(items, (item) => ({ tag: "li", props: { key: item }, children: [`Item ${item}`] }))] };
    mount(vnode);
    expect(document.querySelectorAll("li").length).toBe(2);
    items([]);
    await tick();
    expect(document.querySelectorAll("li").length).toBe(0);
    // Placeholder should exist
    expect(document.querySelector("ul")?.childNodes.length).toBe(1);
    expect(document.querySelector("ul")?.childNodes[0]?.nodeType).toBe(Node.COMMENT_NODE);
  });

  test("should remove unused nodes when items are removed", async () => {
    const items = signal([1, 2, 3]);
    const vnode = { tag: "ul", props: {}, children: [forEach(items, (item) => ({ tag: "li", props: { key: item }, children: [`Item ${item}`] }))] };
    mount(vnode);
    expect(document.querySelectorAll("li").length).toBe(3);
    items([2, 3]);
    await tick();
    const texts = Array.from(document.querySelectorAll("li")).map(li => li.textContent);
    expect(texts).toEqual(["Item 2", "Item 3"]);
  });

  test("should reorder nodes when items are reordered", async () => {
    const items = signal([1, 2, 3]);
    const vnode = { tag: "ul", props: {}, children: [forEach(items, (item) => ({ tag: "li", props: { key: item }, children: [`Item ${item}`] }))] };
    mount(vnode);
    expect(document.querySelectorAll("li").length).toBe(3);
    items([3, 2, 1]);
    await tick();
    const texts = Array.from(document.querySelectorAll("li")).map(li => li.textContent);
    expect(texts).toEqual(["Item 3", "Item 2", "Item 1"]);
  });

  test("should support dynamic children (function)", async () => {
    const signals = [signal("A"), signal("B")];
    const vnode = { tag: "span", props: {}, children: [forEach(signals, (item) => item)] };
    mount(vnode);
    expect(document.querySelector("span")?.textContent).toBe("AB");
    signals[0]?.("B");
    await tick();
    expect(document.querySelector("span")?.textContent).toBe("BB");
  });

  test("should reorder nodes with non-trivial LIS (cover binary search in LIS)", async () => {
    const items = signal([1, 2, 3, 4, 5]);
    const vnode = { tag: "ul", props: {}, children: [forEach(items, (item) => ({ tag: "li", props: { key: item }, children: [`Item ${item}`] }))] };
    mount(vnode);
    expect(document.querySelectorAll("li").length).toBe(5);
    // This permutation will require the LIS binary search
    items([3, 1, 2, 5, 4]);
    await tick();
    const texts = Array.from(document.querySelectorAll("li")).map(li => li.textContent);
    expect(texts).toEqual(["Item 3", "Item 1", "Item 2", "Item 5", "Item 4"]);
  });

  test("handles DocumentFragment in forEach createNode", async () => {
    const items = signal([1, 2]);
    const vnode = {
      tag: "ul",
      props: {},
      children: [
        forEach(items, (item) => ({
          tag: "$",
          props: {},
          children: [
            { tag: "li", props: {}, children: [`Item ${item}`] },
            { tag: "span", props: {}, children: [` (${item})`] }
          ]
        }))
      ]
    };
    mount(vnode);
    expect(document.querySelectorAll("li").length).toBe(2);
    expect(document.querySelectorAll("span").length).toBe(2);
    expect(document.querySelector("li")?.textContent).toBe("Item 1");
    expect(document.querySelector("span")?.textContent).toBe(" (1)");
  });
});
