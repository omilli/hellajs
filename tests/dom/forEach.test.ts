import { describe, test, expect, beforeEach } from "bun:test";
import { signal } from "../../packages/core";
import { forEach, mount } from "../../packages/dom";
import { tick } from "../utils/tick.js";

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
});

describe("dom", () => {
  describe("forEach", () => {
    test("render list and update", async () => {
      const items = signal<number[]>([1, 2, 3]);
      const vnode = { tag: "ul", props: {}, children: [forEach(items, (item) => ({ tag: "li", props: { key: item }, children: [`Item ${item}`] }))] };
      mount(vnode);
      expect(document.querySelectorAll("li").length).toBe(3);
      items([2, 3, 4]);
      await tick();
      const texts = Array.from(document.querySelectorAll("li")).map(li => li.textContent);
      expect(texts).toEqual(["Item 2", "Item 3", "Item 4"]);
    });

    test("clear list when array is empty", async () => {
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

    test("remove unused nodes when items are removed", async () => {
      const items = signal([1, 2, 3]);
      const vnode = { tag: "ul", props: {}, children: [forEach(items, (item) => ({ tag: "li", props: { key: item }, children: [`Item ${item}`] }))] };
      mount(vnode);
      expect(document.querySelectorAll("li").length).toBe(3);
      items([2, 3]);
      await tick();
      const texts = Array.from(document.querySelectorAll("li")).map(li => li.textContent);
      expect(texts).toEqual(["Item 2", "Item 3"]);
    });

    test("reorder nodes when items are reordered", async () => {
      const items = signal([1, 2, 3]);
      const vnode = { tag: "ul", props: {}, children: [forEach(items, (item) => ({ tag: "li", props: { key: item }, children: [`Item ${item}`] }))] };
      mount(vnode);
      expect(document.querySelectorAll("li").length).toBe(3);
      items([3, 2, 1]);
      await tick();
      const texts = Array.from(document.querySelectorAll("li")).map(li => li.textContent);
      expect(texts).toEqual(["Item 3", "Item 2", "Item 1"]);
    });

    test("support dynamic children (function)", async () => {
      const signals = [signal("A"), signal("B")];
      const vnode = { tag: "span", props: {}, children: [forEach(signals, (item) => item)] };
      mount(vnode);
      expect(document.querySelector("span")?.textContent).toBe("AB");
      signals[0]?.("B");
      await tick();
      expect(document.querySelector("span")?.textContent).toBe("BB");
    });

    test("reorder nodes with non-trivial LIS (cover binary search in LIS)", async () => {
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

    test("multiple forEach and dynamic conditionals work together", async () => {
      const list1 = signal([1, 2]);
      const list2 = signal([3, 4]);
      const show = signal(true);

      const vnode = {
        tag: "div",
        props: {},
        children: [
          forEach(list1, (item) => ({ tag: "span", props: { class: "list1" }, children: [`A${item}`] })),
          () => show() ? { tag: "div", props: { class: "conditional" }, children: ["Conditional"] } : null,
          forEach(list2, (item) => ({ tag: "span", props: { class: "list2" }, children: [`B${item}`] }))
        ]
      };

      mount(vnode);

      // Initial render
      expect(document.querySelectorAll(".list1").length).toBe(2);
      expect(document.querySelectorAll(".list2").length).toBe(2);
      expect(document.querySelector(".conditional")).toBeTruthy();

      // Update first forEach
      list1([1, 2, 3]);
      await tick();
      expect(document.querySelectorAll(".list1").length).toBe(3);
      expect(document.querySelectorAll(".list2").length).toBe(2);

      // Toggle conditional
      show(false);
      await tick();
      expect(document.querySelector(".conditional")).toBeFalsy();
      expect(document.querySelectorAll(".list1").length).toBe(3);
      expect(document.querySelectorAll(".list2").length).toBe(2);

      // Update second forEach
      list2([3, 4, 5, 6]);
      await tick();
      expect(document.querySelectorAll(".list1").length).toBe(3);
      expect(document.querySelectorAll(".list2").length).toBe(4);
    });

    test("forEach detection works with proper marker", async () => {
      const list1 = signal([1, 2]);
      const list2 = signal([3, 4]);

      const forEach1 = forEach(list1, (item) => ({ tag: "span", props: { class: "first" }, children: [`A${item}`] }));
      const forEach2 = forEach(list2, (item) => ({ tag: "span", props: { class: "second" }, children: [`B${item}`] }));

      const vnode = {
        tag: "div",
        props: {},
        children: [
          forEach1,
          forEach2
        ]
      };

      mount(vnode);

      // Should work with marker-based detection
      expect(document.querySelectorAll(".first").length).toBe(2);
      expect(document.querySelectorAll(".second").length).toBe(2);

      // Update lists
      list1([1, 2, 3]);
      list2([5, 6]);
      await tick();

      expect(document.querySelectorAll(".first").length).toBe(3);
      expect(document.querySelectorAll(".second").length).toBe(2);
    });
  });
});