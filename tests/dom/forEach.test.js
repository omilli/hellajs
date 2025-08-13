import { describe, test, expect, beforeEach } from "bun:test";
import { signal } from "../../packages/core/dist/core.js";
import { forEach, mount, registerTemplate } from "../../packages/dom/dist/dom.js";
import { tick } from "../utils/tick.js";

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
});

describe("forEach", () => {
  test("should render list and update", async () => {
    const items = signal([1, 2, 3]);
    const vnode = { tag: "ul", props: {}, children: [forEach(items, (item) => ({ tag: "li", props: { key: item }, children: [`Item ${item}`] }))] };
    mount(vnode);
    expect(document.querySelectorAll("li").length).toBe(3);
    items([2, 3, 4]);
    await tick();
    const texts = Array.from(document.querySelectorAll("li")).map(li => li.textContent);
    expect(texts).toEqual(["Item 2", "Item 3", "Item 4"]);
  });

  test("should clear list when array is empty", async () => {
    const items = signal([1, 2]);
    const vnode = { tag: "ul", props: {}, children: [forEach(items, (item) => ({ tag: "li", props: { key: item }, children: [`Item ${item}`] }))] };
    mount(vnode);
    expect(document.querySelectorAll("li").length).toBe(2);
    items([]);
    await tick();
    expect(document.querySelectorAll("li").length).toBe(0);
    // Placeholder should exist
    expect(document.querySelector("ul")?.childNodes.length).toBe(1);
    expect(document.querySelector("ul")?.childNodes[0].nodeType).toBe(Node.COMMENT_NODE);
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
    signals[0]("B");
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

  test("should handle DocumentFragment in forEach createNode", async () => {
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

  describe("template pre-caching in non-JSX mode", () => {
    test("should use template when provided with templateId and paramNames", async () => {
      // Register a template manually (simulating what Babel plugin would do)
      registerTemplate("user-card", (ctx) => ({
        tag: "div",
        props: { class: "user-card", key: ctx.user.id },
        children: [
          { tag: "h3", props: {}, children: [ctx.user.name] },
          { tag: "p", props: {}, children: [`Age: ${ctx.user.age}`] }
        ]
      }));

      const users = signal([
        { id: 1, name: "Alice", age: 30 },
        { id: 2, name: "Bob", age: 25 }
      ]);

      const vnode = {
        tag: "div",
        props: { id: "users" },
        children: [
          forEach(
            users,
            (user) => ({ tag: "div", props: {}, children: [`Fallback: ${user.name}`] }),
            "user-card",
            ["user"]
          )
        ]
      };

      mount(vnode);

      // Should use the registered template, not the fallback
      expect(document.querySelectorAll(".user-card").length).toBe(2);
      expect(document.querySelector("h3")?.textContent).toBe("Alice");
      expect(document.querySelector("p")?.textContent).toBe("Age: 30");
      expect(document.querySelectorAll("h3")[1]?.textContent).toBe("Bob");

      // Should not show fallback content
      expect(document.body.textContent).not.toContain("Fallback:");
    });

    test("should fall back to render function when template not found", async () => {
      const items = signal([1, 2, 3]);

      const vnode = {
        tag: "ul",
        props: {},
        children: [
          forEach(
            items,
            (item) => ({ tag: "li", props: { key: item }, children: [`Fallback Item ${item}`] }),
            "non-existent-template",
            ["item"]
          )
        ]
      };

      mount(vnode);

      // Should use fallback since template doesn't exist
      expect(document.querySelectorAll("li").length).toBe(3);
      expect(document.querySelector("li")?.textContent).toBe("Fallback Item 1");
    });

    test("should work with custom parameter names", async () => {
      // Register template with specific parameter context
      registerTemplate("product-item", (ctx) => ({
        tag: "div",
        props: { class: "product", key: `product-${ctx.product.id}` },
        children: [
          { tag: "span", props: { class: "name" }, children: [ctx.product.name] },
          { tag: "span", props: { class: "index" }, children: [`#${ctx.idx + 1}`] }
        ]
      }));

      const products = signal([
        { id: 1, name: "Laptop" },
        { id: 2, name: "Phone" }
      ]);

      const vnode = {
        tag: "div",
        props: {},
        children: [
          forEach(
            products,
            (product, idx) => ({ tag: "div", props: {}, children: [`${product.name} - ${idx}`] }),
            "product-item",
            ["product", "idx"]
          )
        ]
      };

      mount(vnode);

      expect(document.querySelectorAll(".product").length).toBe(2);
      expect(document.querySelector(".name")?.textContent).toBe("Laptop");
      expect(document.querySelector(".index")?.textContent).toBe("#1");
      expect(document.querySelectorAll(".name")[1]?.textContent).toBe("Phone");
      expect(document.querySelectorAll(".index")[1]?.textContent).toBe("#2");
    });

    test("should update when items change with template caching", async () => {
      registerTemplate("simple-item", (ctx) => ({
        tag: "div",
        props: { class: "cached-item", key: ctx.item },
        children: [`Cached: ${ctx.item}`]
      }));

      const items = signal([1, 2]);

      const vnode = {
        tag: "div",
        props: {},
        children: [
          forEach(
            items,
            (item) => ({ tag: "div", props: {}, children: [`Regular: ${item}`] }),
            "simple-item",
            ["item"]
          )
        ]
      };

      mount(vnode);

      expect(document.querySelectorAll(".cached-item").length).toBe(2);
      expect(document.querySelector(".cached-item")?.textContent).toBe("Cached: 1");

      // Update items
      items([2, 3, 4]);
      await tick();

      expect(document.querySelectorAll(".cached-item").length).toBe(3);
      const texts = Array.from(document.querySelectorAll(".cached-item")).map(el => el.textContent);
      expect(texts).toEqual(["Cached: 2", "Cached: 3", "Cached: 4"]);
    });
  });
});
