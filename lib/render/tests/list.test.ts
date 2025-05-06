import { describe, it, expect, beforeEach } from "bun:test";
import { renderList } from "../list";
import { listMap, createOrReuseItem } from "../../dom/list";
import { VNode } from "../../types";

describe("renderList", () => {
  let parent: HTMLElement;
  let rootSelector = "#root";
  let vNode: () => unknown;

  beforeEach(() => {
    document.body.innerHTML = `<div id="root"></div>`;
    parent = document.querySelector(rootSelector)!;
  });

  it("renders initial list", () => {
    const items = [
      { tag: "div", props: { key: "a" }, children: ["A"] },
      { tag: "div", props: { key: "b" }, children: ["B"] }
    ];
    vNode = () => items;
    renderList(items, vNode, parent, null, rootSelector);
    expect(parent.childNodes.length).toBe(2);
    expect(parent.textContent).toBe("AB");
  });

  it("adds an item", () => {
    let items = [
      { tag: "div", props: { key: "a" }, children: ["A"] }
    ];
    vNode = () => items;
    renderList(items, vNode, parent, null, rootSelector);
    items = [
      { tag: "div", props: { key: "a" }, children: ["A"] },
      { tag: "div", props: { key: "b" }, children: ["B"] }
    ];
    renderList(items, vNode, parent, null, rootSelector);
    expect(parent.childNodes.length).toBe(2);
    expect(parent.textContent).toBe("AB");
  });

  it("removes an item", () => {
    let items = [
      { tag: "div", props: { key: "a" }, children: ["A"] },
      { tag: "div", props: { key: "b" }, children: ["B"] }
    ];
    vNode = () => items;
    renderList(items, vNode, parent, null, rootSelector);
    items = [
      { tag: "div", props: { key: "b" }, children: ["B"] }
    ];
    renderList(items, vNode, parent, null, rootSelector);
    expect(parent.childNodes.length).toBe(1);
    expect(parent.textContent).toBe("B");
  });

  it("reorders items", () => {
    let items = [
      { tag: "div", props: { key: "a" }, children: ["A"] },
      { tag: "div", props: { key: "b" }, children: ["B"] }
    ];
    vNode = () => items;
    renderList(items, vNode, parent, null, rootSelector);
    items = [
      { tag: "div", props: { key: "b" }, children: ["B"] },
      { tag: "div", props: { key: "a" }, children: ["A"] }
    ];
    renderList(items, vNode, parent, null, rootSelector);
    expect(parent.childNodes[0].textContent).toBe("B");
    expect(parent.childNodes[1].textContent).toBe("A");
  });

  it("swaps two items (swap optimization)", () => {
    let items = [
      { tag: "div", props: { key: "a" }, children: ["A"] },
      { tag: "div", props: { key: "b" }, children: ["B"] }
    ];
    vNode = () => items;
    renderList(items, vNode, parent, null, rootSelector);
    items = [
      { tag: "div", props: { key: "b" }, children: ["B"] },
      { tag: "div", props: { key: "a" }, children: ["A"] }
    ];
    renderList(items, vNode, parent, null, rootSelector);
    expect(parent.childNodes[0].textContent).toBe("B");
    expect(parent.childNodes[1].textContent).toBe("A");
  });

  it("cleans up when list is empty", () => {
    let items = [
      { tag: "div", props: { key: "a" }, children: ["A"] }
    ];
    vNode = () => items;
    renderList(items, vNode, parent, null, rootSelector);
    items = [];
    renderList(items, vNode, parent, null, rootSelector);
    expect(parent.childNodes.length).toBe(0);
    expect(listMap.has(vNode)).toBe(false);
  });

  it("calls effectCleanup if effectCleanup exists but node is missing", () => {
    // Covers createOrReuseItem: if (effectCleanup && !node) { ... }
    let cleaned = false;
    const fakeCleanup = () => { cleaned = true; };
    const child = { tag: "div", props: { key: "a" }, children: ["A"] };
    const item = createOrReuseItem(child as VNode, parent, rootSelector, {
      node: undefined as any,
      effectCleanup: fakeCleanup
    });
    expect(cleaned).toBe(true);
    expect(item?.effectCleanup).toBeUndefined();
  });

  it("sets domNode if domNode is null and newKeys not empty", () => {
    // Covers: if (domNode === null) { ... }
    const items = [
      { tag: "div", props: { key: "a" }, children: ["A"] }
    ];
    vNode = () => items;
    // domNode is null, so after renderList, domNode should be set internally
    renderList(items, vNode, parent, null, rootSelector);
    // No assertion needed, just coverage
    expect(parent.childNodes.length).toBe(1);
  });

  it("calls effectCleanup and unsets it if existingItem has effectCleanup but no node", () => {
    // Setup a state with an item that has effectCleanup but no node
    let cleaned = false;
    const fakeCleanup = () => { cleaned = true; };
    const key = "a";
    const vNodeKey = () => [
      { tag: "div", props: { key }, children: ["A"] }
    ];
    // Simulate previous state
    const state = {
      keyToItem: new Map([[key, { node: undefined as any, effectCleanup: fakeCleanup }]]),
      lastKeys: [key]
    };
    // Patch listMap to inject our state
    listMap.set(vNodeKey, state);

    // Now call renderList, which will hit the effectCleanup && !node branch
    renderList([{ tag: "div", props: { key }, children: ["A"] }], vNodeKey, parent, null, rootSelector);

    expect(cleaned).toBe(true);
    // Optionally, check that effectCleanup is now undefined
    expect(state.keyToItem.get(key)?.effectCleanup).toBeUndefined();
  });

  it("calls effectCleanup and unsets it if existingItem has effectCleanup but no node (real listMap)", () => {
    let cleaned = false;
    const fakeCleanup = () => { cleaned = true; };
    const key = "a";
    const vNodeKey = () => [
      { tag: "div", props: { key }, children: ["A"] }
    ];
    // Simulate previous state in the actual listMap
    listMap.set(vNodeKey, {
      keyToItem: new Map([[key, { node: undefined as any, effectCleanup: fakeCleanup }]]),
      lastKeys: [key]
    });

    // Now call renderList, which will hit the effectCleanup && !node branch
    renderList([{ tag: "div", props: { key }, children: ["A"] }], vNodeKey, document.createElement("div"), null, "#root");

    expect(cleaned).toBe(true);
    // Optionally, check that effectCleanup is now undefined
    const state = listMap.get(vNodeKey);
    expect(state?.keyToItem.get(key)?.effectCleanup).toBeUndefined();
  });
});
