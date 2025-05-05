import { describe, it, expect, beforeEach, mock } from 'bun:test';
import {
  bindList,
  createOrReuseItem,
  removeItem,
  ListItem
} from "../list";
import { EventDelegator } from "../events";

describe("list", () => {
  let parent: HTMLElement;
  let rootSelector = "#root";
  let delegator: EventDelegator;

  beforeEach(() => {
    document.body.innerHTML = `<div id="root"></div>`;
    parent = document.querySelector(rootSelector)!;
    delegator = new EventDelegator(rootSelector);
  });

  it("bindList returns cleanup for function children", () => {
    const child = { children: [() => "foo", () => "bar"] };
    const node = document.createElement("div");
    node.appendChild(document.createTextNode(""));
    node.appendChild(document.createTextNode(""));
    const cleanup = bindList(child as any, node);
    expect(typeof cleanup).toBe("function");
    cleanup!();
  });

  it("bindList returns undefined for no function children", () => {
    const child = { children: ["foo", "bar"] };
    const node = document.createElement("div");
    const cleanup = bindList(child as any, node);
    expect(cleanup).toBeUndefined();
  });

  it("createOrReuseItem creates new item if none exists", () => {
    const child = { tag: "span", props: {}, children: ["hi"] };
    const item = createOrReuseItem(child as any, parent, rootSelector);
    expect(item?.node).toBeInstanceOf(Node);
  });

  it("createOrReuseItem reuses node and effectCleanup", () => {
    const child = { tag: "span", props: {}, children: ["hi"] };
    const fakeNode = document.createElement("span");
    const fakeCleanup = mock(() => { });
    const item = createOrReuseItem(child as any, parent, rootSelector, {
      node: fakeNode,
      effectCleanup: fakeCleanup
    });
    expect(item?.node).toBe(fakeNode);
  });

  it("removeItem removes node and calls cleanup", () => {
    const node = document.createElement("div");
    parent.appendChild(node);
    const cleanup = mock(() => { });
    const context = { cleanup };
    (node as any)._context = context;
    const item: ListItem = { node, effectCleanup: cleanup };
    delegator.removeHandlersForElement = mock(() => { });
    removeItem(item, parent, delegator as any);
    expect(parent.contains(node)).toBe(false);
    expect(cleanup).toHaveBeenCalled();
    expect(delegator.removeHandlersForElement).toHaveBeenCalled();
  });
});
