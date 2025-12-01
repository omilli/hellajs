import { describe, test, expect, beforeEach } from "bun:test";
import { mount, html, ForEach } from "../";
import type { HellaNode, HellaChild } from "../";
import type { Signal } from "@hellajs/core";

interface TestItem {
  id: number;
  name?: string;
  label?: string;
}

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
});

describe("ForEach list reconciliation", () => {
  const createList = <T>(items: T[] | (() => T[]), itemRenderer?: (item: T) => HellaChild): HellaNode => ({
    tag: "ul",
    children: [ForEach({
      each: items,
      use: itemRenderer || ((item: T) => ({ tag: "li", props: { key: item }, children: [`Item ${item}`] }))
    })]
  });

  const getListTexts = () => Array.from(document.querySelectorAll("li")).map(li => li.textContent);

  test("renders, updates, and reorders lists with keyed reconciliation", () => {
    const items = signal([1, 2, 3]);
    mount(() => createList(items));

    expect(getListTexts()).toEqual(["Item 1", "Item 2", "Item 3"]);

    items([2, 3, 4]);
    flush();
    expect(getListTexts()).toEqual(["Item 2", "Item 3", "Item 4"]);

    items([3, 1, 2]);
    flush();
    expect(getListTexts()).toEqual(["Item 3", "Item 1", "Item 2"]);

    items([]);
    flush();
    expect(document.querySelectorAll("li").length).toBe(0);
    const ul = document.querySelector("ul");
    expect(ul?.childNodes[0]?.nodeType).toBe(Node.COMMENT_NODE);

    items([5, 6]);
    flush();
    expect(getListTexts()).toEqual(["Item 5", "Item 6"]);
  });

  test("LIS algorithm minimizes moves for complex reorderings", () => {
    const items = signal([1, 2, 3, 4, 5]);
    mount(() => createList(items));
    expect(document.querySelectorAll("li").length).toBe(5);

    items([3, 1, 2, 5, 4]);
    flush();
    expect(getListTexts()).toEqual(["Item 3", "Item 1", "Item 2", "Item 5", "Item 4"]);
  });

  test("complete replacement uses fast path", () => {
    const items = signal<TestItem[]>([{ id: 1, name: "A" }, { id: 2, name: "B" }]);
    const renderer = (item: TestItem) => ({ tag: "li", props: { key: item.id }, children: [item.name] });

    mount(() => createList(items, renderer));
    expect(getListTexts()).toEqual(["A", "B"]);

    items([{ id: 10, name: "X" }, { id: 20, name: "Y" }, { id: 30, name: "Z" }]);
    flush();
    expect(getListTexts()).toEqual(["X", "Y", "Z"]);
  });

  test("complete replacement with zero overlap triggers fast path", () => {
    const items = signal<TestItem[]>([{ id: 1, name: "A" }, { id: 2, name: "B" }, { id: 3, name: "C" }]);
    const renderer = (item: TestItem) => ({ tag: "li", props: { key: item.id }, children: [item.name] });

    mount(() => createList(items, renderer));
    expect(getListTexts()).toEqual(["A", "B", "C"]);

    items([{ id: 100, name: "X" }, { id: 200, name: "Y" }]);
    flush();
    expect(getListTexts()).toEqual(["X", "Y"]);
  });

  test("reference equality triggers updates on key match", () => {
    const item1: TestItem = { id: 1, label: "red" };
    const item2: TestItem = { id: 2, label: "blue" };
    const items = signal<TestItem[]>([item1, item2]);

    const renderer = (item: TestItem) => ({ tag: "li", props: { key: item.id }, children: [item.label] });
    mount(() => createList(items, renderer));

    expect(getListTexts()).toEqual(["red", "blue"]);

    items([{ id: 1, label: "RED" }, item2]);
    flush();
    expect(getListTexts()).toEqual(["RED", "blue"]);
  });

  test("handles fragments and nested structures", () => {
    const items = signal([1, 2]);
    const fragmentRenderer = (item: number): HellaNode => ({
      tag: "$",
      children: [
        { tag: "li", children: [`Item ${item}`] },
        { tag: "span", children: [`(${item})`] }
      ]
    });

    mount(() => createList(items, fragmentRenderer));
    expect(document.querySelectorAll("li").length).toBe(2);
    expect(document.querySelectorAll("span").length).toBe(2);
  });

  test("preserves sibling elements during updates", () => {
    const items = signal([1, 2]);
    const showEmpty = signal(false);

    mount(() => ({
      tag: "div",
      props: { class: "wrapper" },
      children: [
        ForEach({ each: items, use: (item: number) => ({ tag: "div", props: { class: "item" }, children: [`${item}`] }) }),
        { tag: "p", props: { class: "footer" }, children: ["Always visible"] },
        () => showEmpty() && { tag: "p", props: { class: "empty" }, children: ["No items"] }
      ]
    }));

    expect(document.querySelectorAll(".item").length).toBe(2);
    expect(document.querySelector(".footer")?.textContent).toBe("Always visible");

    items([]);
    showEmpty(true);
    flush();

    expect(document.querySelectorAll(".item").length).toBe(0);
    expect(document.querySelector(".footer")).not.toBeNull();
    expect(document.querySelector(".empty")?.textContent).toBe("No items");
  });

  test("fallback renders when empty and clears when items added", () => {
    const items = signal<string[]>([]);

    mount({
      tag: "ul",
      children: [ForEach({
        each: items,
        use: (item) => ({ tag: "li", children: [item] }),
        fallback: { tag: "li", props: { class: "empty" }, children: ["No items"] }
      })]
    });

    expect(document.querySelector(".empty")?.textContent).toBe("No items");

    items(["a", "b"]);
    flush();
    expect(document.querySelector(".empty")).toBeNull();
    expect(document.querySelectorAll("li").length).toBe(2);

    items([]);
    flush();
    expect(document.querySelector(".empty")).not.toBeNull();
  });

  test("dynamic signals within list items update independently", () => {
    const signals = [signal("A"), signal("B")];
    mount(() => ({
      tag: "span",
      children: [ForEach({ each: signals, use: (item) => item })]
    }));

    expect(document.querySelector("span")?.textContent).toBe("AB");

    signals[0]?.("X");
    flush();
    expect(document.querySelector("span")?.textContent).toBe("XB");
  });

  test("handles swap operations with reactive row content", () => {
    interface ReactiveRow {
      id: number;
      label: Signal<string>;
    }
    const rows = signal<ReactiveRow[]>([
      { id: 1, label: signal("Item 1") },
      { id: 2, label: signal("Item 2") }
    ]);
    const selected = signal<number | undefined>(undefined);

    mount(() => ({
      tag: "table",
      children: [{
        tag: "tbody",
        children: [ForEach({
          each: rows,
          use: (row: ReactiveRow) => ({
            tag: "tr",
            props: { key: row.id },
            children: [
              { tag: "td", children: [row.id] },
              { tag: "td", children: [{ tag: "a", props: { class: "lbl" }, on: { click: () => selected(row.id) }, children: [row.label] }] }
            ]
          })
        })]
      }]
    }));

    (document.querySelector(".lbl") as HTMLElement).click();
    flush();
    expect(selected()).toBe(1);

    const list = [...rows()];
    [list[0], list[1]] = [list[1]!, list[0]!];
    rows(list);
    flush();

    const links = document.querySelectorAll(".lbl");
    (links[1] as HTMLElement).click();
    flush();
    expect(selected()).toBe(1);
  });

  test("clears large lists efficiently after appending", () => {
    const buildData = (start: number, count: number): TestItem[] =>
      Array.from({ length: count }, (_, i) => ({ id: start + i, label: `Item ${start + i}` }));

    const items = signal(buildData(1, 100));
    mount(() => ({
      tag: "div",
      children: [ForEach({
        each: items,
        use: (item: TestItem) => ({ tag: "div", props: { key: item.id, class: "item" }, children: [item.label] })
      })]
    }));

    expect(document.querySelectorAll(".item").length).toBe(100);

    items([...items(), ...buildData(101, 100)]);
    flush();
    expect(document.querySelectorAll(".item").length).toBe(200);

    items([]);
    flush();
    expect(document.querySelectorAll(".item").length).toBe(0);
  });

  test("no-change fast path skips DOM operations", () => {
    const items = signal([1, 2, 3]);
    let domOps = 0;

    const origRemove = Element.prototype.removeChild;
    const origInsert = Element.prototype.insertBefore;
    Element.prototype.removeChild = function <T extends Node>(child: T): T { domOps++; return origRemove.call(this, child) as T; };
    Element.prototype.insertBefore = function <T extends Node>(node: T, ref: Node | null): T { domOps++; return origInsert.call(this, node, ref) as T; };

    mount(() => createList(items));
    const initial = domOps;

    items([1, 2, 3]);
    flush();
    expect(domOps).toBe(initial);

    Element.prototype.removeChild = origRemove;
    Element.prototype.insertBefore = origInsert;
  });

  test("html ForEach component syntax", () => {
    const items = signal(["a", "b", "c"]);

    mount(html`
      <ul>
        <${ForEach} each=${items} use=${(item: string) => html`<li>${item}</li>`} />
      </ul>
    `);

    expect(getListTexts()).toEqual(["a", "b", "c"]);

    items(["x", "y"]);
    flush();
    expect(getListTexts()).toEqual(["x", "y"]);
  });
});
