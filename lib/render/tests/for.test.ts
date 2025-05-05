import { describe, it, expect, beforeEach } from "bun:test";
import { renderFor } from "../for";
import { listMap, createOrReuseItem } from "../../dom/list";
import { VNode } from "../../types";

describe("renderFor", () => {
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
    renderFor(items, vNode, parent, null, rootSelector);
    expect(parent.childNodes.length).toBe(2);
    expect(parent.textContent).toBe("AB");
  });

  it("adds an item", () => {
    let items = [
      { tag: "div", props: { key: "a" }, children: ["A"] }
    ];
    vNode = () => items;
    renderFor(items, vNode, parent, null, rootSelector);
    items = [
      { tag: "div", props: { key: "a" }, children: ["A"] },
      { tag: "div", props: { key: "b" }, children: ["B"] }
    ];
    renderFor(items, vNode, parent, null, rootSelector);
    expect(parent.childNodes.length).toBe(2);
    expect(parent.textContent).toBe("AB");
  });

  it("removes an item", () => {
    let items = [
      { tag: "div", props: { key: "a" }, children: ["A"] },
      { tag: "div", props: { key: "b" }, children: ["B"] }
    ];
    vNode = () => items;
    renderFor(items, vNode, parent, null, rootSelector);
    items = [
      { tag: "div", props: { key: "b" }, children: ["B"] }
    ];
    renderFor(items, vNode, parent, null, rootSelector);
    expect(parent.childNodes.length).toBe(1);
    expect(parent.textContent).toBe("B");
  });

  it("reorders items", () => {
    let items = [
      { tag: "div", props: { key: "a" }, children: ["A"] },
      { tag: "div", props: { key: "b" }, children: ["B"] }
    ];
    vNode = () => items;
    renderFor(items, vNode, parent, null, rootSelector);
    items = [
      { tag: "div", props: { key: "b" }, children: ["B"] },
      { tag: "div", props: { key: "a" }, children: ["A"] }
    ];
    renderFor(items, vNode, parent, null, rootSelector);
    expect(parent.childNodes[0].textContent).toBe("B");
    expect(parent.childNodes[1].textContent).toBe("A");
  });
});
