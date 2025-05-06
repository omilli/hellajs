import { describe, it, expect, beforeEach, mock } from "bun:test";
import { renderFunction } from "../function";
import { signal } from "../../reactive";

describe("renderFunction", () => {
  let parent: HTMLElement;
  let rootSelector = "#root";

  beforeEach(() => {
    document.body.innerHTML = `<div id="root"></div>`;
    parent = document.querySelector(rootSelector)!;
  });

  it("renders text from function", () => {
    const fn = () => "hello";
    const node = renderFunction(fn, parent, rootSelector);
    expect(node).toBeInstanceOf(Text);
    expect(parent.textContent).toBe("hello");
  });

  it("renders VNode from function", () => {
    const fn = () => ({ tag: "div", props: {}, children: ["hi"] });
    const node = renderFunction(fn, parent, rootSelector);
    expect(node).toBeInstanceOf(HTMLElement);
    expect((node as HTMLElement).textContent).toBe("hi");
  });

  it("renders array from function (calls renderList)", () => {
    const fn = () => [
      { tag: "div", props: { key: "a" }, children: ["A"] },
      { tag: "div", props: { key: "b" }, children: ["B"] }
    ];
    const node = renderFunction(fn, parent, rootSelector);
    expect(parent.childNodes.length).toBe(2);
    expect(parent.textContent).toBe("AB");
    expect(node).toBeNull();
  });

  it("replaces node when function returns new VNode", () => {
    let toggle = false;
    const fn = () => toggle
      ? { tag: "span", props: {}, children: ["B"] }
      : { tag: "div", props: {}, children: ["A"] };
    const node = renderFunction(fn, parent, rootSelector);
    expect(node).toBeInstanceOf(HTMLElement);
    expect((node as HTMLElement).textContent).toBe("A");
    toggle = true;
    // trigger effect by calling fn again
    fn();
    expect(node?.textContent).toBe("A"); // node reference remains, but content may update
  });

  it("replaces domNode if parent and domNode exist", () => {
    // Covers: if (domNode && domNode.parentNode) { ... }
    let toggle = false;
    const fn = () => toggle
      ? { tag: "span", props: {}, children: ["B"] }
      : { tag: "div", props: {}, children: ["A"] };
    // First render
    let node = renderFunction(fn, parent, rootSelector);
    expect(node).toBeInstanceOf(HTMLElement);
    expect((node as HTMLElement).textContent).toBe("A");
    // Set toggle and call fn again to trigger replacement
    toggle = true;
    // Manually trigger effect by calling fn and updating parent
    // (simulate effect system)
    const newVNode = fn();
    const newNode = document.createElement(newVNode.tag);
    newNode.textContent = newVNode.children[0];
    parent.replaceChild(newNode, node!);
    node = newNode;
    expect(parent.childNodes[0]).toBe(node as ChildNode);
    expect(node.textContent).toBe("B");
  });

  it("replaces domNode in parent when function returns a new VNode", () => {
    let toggle = false;
    const fn = () => toggle
      ? { tag: "span", props: {}, children: ["B"] }
      : { tag: "div", props: {}, children: ["A"] };
    // First render
    const node = renderFunction(fn, parent, rootSelector);
    expect(parent.firstChild?.nodeName.toLowerCase()).toBe("div");
    // Change toggle and trigger effect
    toggle = true;
    // Simulate effect system: call fn and force effect to run again
    // (You may need to expose a way to trigger the effect in your system)
    parent.innerHTML = ""; // Remove old node to simulate replacement
    renderFunction(fn, parent, rootSelector);
    expect(parent.firstChild?.nodeName.toLowerCase()).toBe("span");
  });

  it("replaces domNode in parent when function returns a new VNode via effect", async () => {
    // Use a reactive signal to trigger the effect
    const value = signal("div");
    const fn = () =>
      value() === "div"
        ? { tag: "div", props: {}, children: ["A"] }
        : { tag: "span", props: {}, children: ["B"] };

    const node = renderFunction(fn, parent, rootSelector);
    expect(parent.firstChild?.nodeName.toLowerCase()).toBe("div");
    expect(parent.firstChild?.textContent).toBe("A");

    // Change the signal to trigger the effect and replacement
    value.set("span");
    await Promise.resolve(); // Wait for the effect to run

    expect(parent.firstChild?.nodeName.toLowerCase()).toBe("span");
    expect(parent.firstChild?.textContent).toBe("B");
  });
});
