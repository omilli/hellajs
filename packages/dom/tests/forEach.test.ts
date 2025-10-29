import { describe, test, expect, beforeEach } from "bun:test";
import { forEach, mount } from "../";

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
});

describe("forEach", () => {
  const createList = (items: any, itemRenderer?: (item: any) => any) => ({
    tag: "ul",
    props: {},
    children: [forEach(items, itemRenderer || ((item: any) => ({ tag: "li", props: { key: item }, children: [`Item ${item}`] })))]
  });

  const getListItems = () => Array.from(document.querySelectorAll("li"));
  const getListTexts = () => getListItems().map(li => li.textContent);
  const expectListLength = (length: number) => expect(getListItems().length).toBe(length);
  const expectListTexts = (texts: string[]) => expect(getListTexts()).toEqual(texts);

  test("renders and updates lists", () => {
    const items = signal([1, 2, 3]);
    mount(createList(items));

    expectListLength(3);
    expectListTexts(["Item 1", "Item 2", "Item 3"]);

    items([2, 3, 4]);
    flush();
    expectListTexts(["Item 2", "Item 3", "Item 4"]);
  });

  test("handles list modifications", () => {
    const items = signal([1, 2, 3]);
    mount(createList(items));
    expectListLength(3);

    items([]);
    flush();
    expectListLength(0);
    const ul = document.querySelector("ul");
    expect(ul?.childNodes.length).toBe(1);
    expect(ul?.childNodes[0]?.nodeType).toBe(Node.COMMENT_NODE);

    items([2, 3]);
    flush();
    expectListTexts(["Item 2", "Item 3"]);

    items([3, 2, 1]);
    flush();
    expectListTexts(["Item 3", "Item 2", "Item 1"]);
  });

  test("supports dynamic children", () => {
    const signals = [signal("A"), signal("B")];
    mount({ tag: "span", props: {}, children: [forEach(signals, (item) => item)] });

    expect(document.querySelector("span")?.textContent).toBe("AB");

    signals[0]?.("X");
    flush();
    expect(document.querySelector("span")?.textContent).toBe("XB");
  });

  test("optimizes with LIS algorithm", () => {
    const items = signal([1, 2, 3, 4, 5]);
    mount(createList(items));
    expectListLength(5);

    items([3, 1, 2, 5, 4]);
    flush();
    expectListTexts(["Item 3", "Item 1", "Item 2", "Item 5", "Item 4"]);
  });

  test("handles fragments", () => {
    const items = signal([1, 2]);
    const fragmentRenderer = (item: any) => ({
      tag: "$",
      props: {},
      children: [
        { tag: "li", props: {}, children: [`Item ${item}`] },
        { tag: "span", props: {}, children: [`(${item})`] }
      ]
    });

    mount(createList(items, fragmentRenderer));

    expect(document.querySelectorAll("li").length).toBe(2);
    expect(document.querySelectorAll("span").length).toBe(2);
    expect(document.querySelector("li")?.textContent).toBe("Item 1");
    expect(document.querySelector("span")?.textContent).toBe("(1)");
  });

  test("works with multiple forEach and conditionals", () => {
    const listA = signal([1, 2]);
    const listB = signal([3, 4]);
    const showConditional = signal(true);

    mount({
      tag: "div",
      props: {},
      children: [
        forEach(listA, (item) => ({ tag: "span", props: { class: "a" }, children: [`A${item}`] })),
        () => showConditional() ? { tag: "div", props: { class: "conditional" }, children: ["Shown"] } : null,
        forEach(listB, (item) => ({ tag: "span", props: { class: "b" }, children: [`B${item}`] }))
      ]
    });

    expect(document.querySelectorAll(".a").length).toBe(2);
    expect(document.querySelectorAll(".b").length).toBe(2);
    expect(document.querySelector(".conditional")).toBeTruthy();

    listA([1, 2, 3]);
    flush();
    expect(document.querySelectorAll(".a").length).toBe(3);
    expect(document.querySelectorAll(".b").length).toBe(2);

    showConditional(false);
    flush();
    expect(document.querySelector(".conditional")).toBeFalsy();

    listB([3, 4, 5, 6]);
    flush();
    expect(document.querySelectorAll(".b").length).toBe(4);
  });

  test("handles forEach markers correctly", () => {
    const listA = signal([1, 2]);
    const listB = signal([3, 4]);

    const forEachA = forEach(listA, (item: number) => ({ tag: "span", props: { class: "first" }, children: [`A${item}`] }));
    const forEachB = forEach(listB, (item: number) => ({ tag: "span", props: { class: "second" }, children: [`B${item}`] }));

    mount({
      tag: "div",
      props: {},
      children: [forEachA, forEachB]
    });

    expect(document.querySelectorAll(".first").length).toBe(2);
    expect(document.querySelectorAll(".second").length).toBe(2);

    listA([1, 2, 3]);
    listB([5, 6]);
    flush();

    expect(document.querySelectorAll(".first").length).toBe(3);
    expect(document.querySelectorAll(".second").length).toBe(2);
  });

  test("uses fast path for complete replacement", () => {
    const items = signal([{ id: 1, name: "Alpha" }, { id: 2, name: "Beta" }]);
    const itemRenderer = (item: any) => ({
      tag: "li",
      props: { key: item.id },
      children: [item.name]
    });

    mount(createList(items, itemRenderer));
    expectListLength(2);
    expectListTexts(["Alpha", "Beta"]);

    items([{ id: 10, name: "X" }, { id: 20, name: "Y" }, { id: 30, name: "Z" }]);
    flush();

    expectListLength(3);
    expectListTexts(["X", "Y", "Z"]);
  });

  test("updates DOM when item properties change but keys remain same", () => {
    const items = signal([
      { id: 1, label: "red apple" },
      { id: 2, label: "blue berry" },
      { id: 3, label: "green grape" }
    ]);

    const itemRenderer = (item: any) => ({
      tag: "li",
      props: { key: item.id },
      children: [item.label]
    });

    mount(createList(items, itemRenderer));
    expectListLength(3);
    expectListTexts(["red apple", "blue berry", "green grape"]);

    // Mutate properties but keep same keys (IDs)
    const updated = items().slice();
    for (let i = 0; i < updated.length; i += 2) {
      updated[i] = { ...updated[i], label: updated[i].label + " !!!" };
    }
    items(updated);
    flush();

    expectListTexts(["red apple !!!", "blue berry", "green grape !!!"]);
  });
});