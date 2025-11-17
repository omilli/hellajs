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
    mount(() => createList(items));

    expectListLength(3);
    expectListTexts(["Item 1", "Item 2", "Item 3"]);

    items([2, 3, 4]);
    flush();
    expectListTexts(["Item 2", "Item 3", "Item 4"]);
  });

  test("handles list modifications", () => {
    const items = signal([1, 2, 3]);
    mount(() => createList(items));
    expectListLength(3);

    items([]);
    flush();
    expectListLength(0);
    const ul = document.querySelector("ul");
    expect(ul?.childNodes.length).toBe(2);
    expect(ul?.childNodes[0]?.nodeType).toBe(Node.COMMENT_NODE);
    expect(ul?.childNodes[1]?.nodeType).toBe(Node.COMMENT_NODE);

    items([2, 3]);
    flush();
    expectListTexts(["Item 2", "Item 3"]);

    items([3, 2, 1]);
    flush();
    expectListTexts(["Item 3", "Item 2", "Item 1"]);
  });

  test("supports dynamic children", () => {
    const signals = [signal("A"), signal("B")];
    mount(() => ({ tag: "span", props: {}, children: [forEach(signals, (item) => item)] }));

    expect(document.querySelector("span")?.textContent).toBe("AB");

    signals[0]?.("X");
    flush();
    expect(document.querySelector("span")?.textContent).toBe("XB");
  });

  test("optimizes with LIS algorithm", () => {
    const items = signal([1, 2, 3, 4, 5]);
    mount(() => createList(items));
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

    mount(() => createList(items, fragmentRenderer));

    expect(document.querySelectorAll("li").length).toBe(2);
    expect(document.querySelectorAll("span").length).toBe(2);
    expect(document.querySelector("li")?.textContent).toBe("Item 1");
    expect(document.querySelector("span")?.textContent).toBe("(1)");
  });

  test("forEach as child of fragment maintains reactive binding on replacement", () => {
    const items = signal([1, 2, 3]);

    const fragmentWithForEach = {
      tag: "$",
      props: {},
      children: [
        forEach(items, (item) => ({
          tag: "li",
          props: { key: item },
          children: [`Item ${item}`]
        }))
      ]
    };

    mount(() => ({
      tag: "ul",
      props: {},
      children: [fragmentWithForEach]
    }));

    expectListLength(3);
    expectListTexts(["Item 1", "Item 2", "Item 3"]);

    items([4, 5, 6]);
    flush();

    expectListLength(3);
    expectListTexts(["Item 4", "Item 5", "Item 6"]);
  });

  test("forEach as child of fragment maintains reactive binding on append", () => {
    const items = signal([1, 2]);

    mount(() => ({
      tag: "div",
      props: {},
      children: [{
        tag: "$",
        props: {},
        children: [
          forEach(items, (item) => ({
            tag: "span",
            props: { class: "item" },
            children: [`${item}`]
          }))
        ]
      }]
    }));

    expect(document.querySelectorAll(".item").length).toBe(2);
    expect(document.querySelectorAll(".item")[0]?.textContent).toBe("1");

    items([1, 2, 3, 4]);
    flush();

    expect(document.querySelectorAll(".item").length).toBe(4);
    expect(document.querySelectorAll(".item")[3]?.textContent).toBe("4");
  });

  test("works with multiple forEach and conditionals", () => {
    const listA = signal([1, 2]);
    const listB = signal([3, 4]);
    const showConditional = signal(true);

    mount(() => ({
      tag: "div",
      props: { id: "forEach-conditional-test" },
      children: [
        forEach(listA, (item) => ({ tag: "span", props: { class: "a" }, children: [`A${item}`] })),
        () => showConditional() ? { tag: "div", props: { class: "conditional" }, children: ["Shown"] } : null,
        forEach(listB, (item) => ({ tag: "span", props: { class: "b" }, children: [`B${item}`] }))
      ]
    }));

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
    const container = document.getElementById("forEach-conditional-test")!;
    expect(container.textContent).not.toContain("null");
    expect(container.textContent).not.toContain("false");

    listB([3, 4, 5, 6]);
    flush();
    expect(document.querySelectorAll(".b").length).toBe(4);
  });

  test("handles forEach markers correctly", () => {
    const listA = signal([1, 2]);
    const listB = signal([3, 4]);

    const forEachA = forEach(listA, (item: number) => ({ tag: "span", props: { class: "first" }, children: [`A${item}`] }));
    const forEachB = forEach(listB, (item: number) => ({ tag: "span", props: { class: "second" }, children: [`B${item}`] }));

    mount(() => ({
      tag: "div",
      props: {},
      children: [forEachA, forEachB]
    }));

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

    mount(() => createList(items, itemRenderer));
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

    mount(() => createList(items, itemRenderer));
    expectListLength(3);
    expectListTexts(["red apple", "blue berry", "green grape"]);

    const updated = items().slice();
    for (let i = 0; i < updated.length; i += 2) {
      updated[i] = { ...updated[i], label: updated[i].label + " !!!" };
    }
    items(updated);
    flush();

    expectListTexts(["red apple !!!", "blue berry", "green grape !!!"]);
  });

  test("preserves sibling elements in fragments", () => {
    const items = signal([1, 2]);

    const FragmentComponent = () => ({
      tag: "$",
      props: {},
      children: [
        forEach(items, (item: number) => ({
          tag: "span",
          props: { class: "item" },
          children: [`Item ${item}`]
        })),
        { tag: "div", props: { class: "sibling" }, children: ["I am a sibling"] }
      ]
    });

    mount(FragmentComponent);

    expect(document.querySelectorAll(".item").length).toBe(2);
    expect(document.querySelector(".sibling")).toBeTruthy();
    expect(document.querySelector(".sibling")?.textContent).toBe("I am a sibling");
  });

  test("preserves siblings with nested fragments", () => {
    const items = signal([1, 2]);

    mount(() => ({
      tag: "$",
      props: {},
      children: [
        forEach(items, (item: number) => ({
          tag: "$",
          props: {},
          children: [
            { tag: "span", props: { class: "item" }, children: [`Item ${item}`] },
            { tag: "em", props: {}, children: ["-"] }
          ]
        })),
        { tag: "div", props: { class: "sibling" }, children: ["Sibling text"] }
      ]
    }));

    expect(document.querySelectorAll(".item").length).toBe(2);
    expect(document.querySelectorAll("em").length).toBe(2);
    expect(document.querySelector(".sibling")).toBeTruthy();
    expect(document.querySelector(".sibling")?.textContent).toBe("Sibling text");
  });

  test("preserves siblings with reactive content", () => {
    const items = signal([1, 2, 3]);
    const showMessage = signal(true);

    mount(() => ({
      tag: "div",
      props: { class: "container" },
      children: [
        forEach(items, (item: number) => ({
          tag: "div",
          props: { class: "item" },
          children: [`Item ${item}`]
        })),
        { tag: "p", props: { class: "static-sibling" }, children: ["Static sibling"] },
        () => showMessage() && { tag: "p", props: { class: "conditional-sibling" }, children: ["Conditional sibling"] }
      ]
    }));

    expect(document.querySelectorAll(".item").length).toBe(3);
    expect(document.querySelector(".static-sibling")).toBeTruthy();
    expect(document.querySelector(".static-sibling")?.textContent).toBe("Static sibling");
    expect(document.querySelector(".conditional-sibling")).toBeTruthy();
    expect(document.querySelector(".conditional-sibling")?.textContent).toBe("Conditional sibling");

    showMessage(false);
    flush();
    expect(document.querySelector(".conditional-sibling")).toBeFalsy();
    expect(document.querySelector(".static-sibling")).toBeTruthy();
  });

  test("preserves siblings when list becomes empty", () => {
    const items = signal([1, 2]);

    mount(() => ({
      tag: "div",
      props: { class: "wrapper" },
      children: [
        forEach(items, (item: number) => ({
          tag: "div",
          props: { class: "item" },
          children: [`Item ${item}`]
        })),
        { tag: "p", props: { class: "footer" }, children: ["Always visible"] }
      ]
    }));

    expect(document.querySelectorAll(".item").length).toBe(2);
    expect(document.querySelector(".footer")).toBeTruthy();
    expect(document.querySelector(".footer")?.textContent).toBe("Always visible");

    items([]);
    flush();
    expect(document.querySelectorAll(".item").length).toBe(0);
    expect(document.querySelector(".footer")).toBeTruthy();
    expect(document.querySelector(".footer")?.textContent).toBe("Always visible");
  });

  test("preserves multiple siblings with conditional rendering", () => {
    const items = signal([
      { value: "en", label: "English" },
      { value: "es", label: "Spanish" }
    ]);

    mount(() => ({
      tag: "div",
      props: { class: "list" },
      children: [
        forEach(items, (item: any) => ({
          tag: "div",
          props: { key: item.value, class: "item" },
          children: [item.label]
        })),
        { tag: "p", props: { class: "footer" }, children: ["Footer text"] },
        () => items().length === 0 && { tag: "p", props: { class: "empty" }, children: ["No items found"] }
      ]
    }));

    expect(document.querySelectorAll(".item").length).toBe(2);
    expect(document.querySelector(".footer")).toBeTruthy();
    expect(document.querySelector(".footer")?.textContent).toBe("Footer text");
    expect(document.querySelector(".empty")).toBeFalsy();

    items([]);
    flush();
    expect(document.querySelectorAll(".item").length).toBe(0);
    expect(document.querySelector(".footer")).toBeTruthy();
    expect(document.querySelector(".empty")).toBeTruthy();
    expect(document.querySelector(".empty")?.textContent).toBe("No items found");
  });

  test("clears all items after appending", () => {
    const items = signal([
      { id: 1, label: "Item 1" },
      { id: 2, label: "Item 2" }
    ]);

    mount(() => ({
      tag: "div",
      props: {},
      children: [
        forEach(items, (item: any) => ({
          tag: "div",
          props: { key: item.id, class: "item" },
          children: [item.label]
        }))
      ]
    }));

    expect(document.querySelectorAll(".item").length).toBe(2);

    items([...items(), { id: 3, label: "Item 3" }, { id: 4, label: "Item 4" }]);
    flush();
    expect(document.querySelectorAll(".item").length).toBe(4);

    items([]);
    flush();
    expect(document.querySelectorAll(".item").length).toBe(0);
  });

  test("clears large lists after appending", () => {
    const buildData = (start: number, count: number) => {
      return Array.from({ length: count }, (_, i) => ({
        id: start + i,
        label: `Item ${start + i}`
      }));
    };

    const items = signal(buildData(1, 1000));

    mount(() => ({
      tag: "div",
      props: {},
      children: [
        forEach(items, (item: any) => ({
          tag: "div",
          props: { key: item.id, class: "item" },
          children: [item.label]
        }))
      ]
    }));

    expect(document.querySelectorAll(".item").length).toBe(1000);

    items([...items(), ...buildData(1001, 1000)]);
    flush();
    expect(document.querySelectorAll(".item").length).toBe(2000);

    items([]);
    flush();
    expect(document.querySelectorAll(".item").length).toBe(0);
  });

  test("reactive after swapping elements", () => {
    const rows = signal([
      { id: 1, label: signal("Item 1") },
      { id: 2, label: signal("Item 2") },
      { id: 3, label: signal("Item 998") },
      { id: 4, label: signal("Item 999") }
    ]);
    const selected = signal(undefined);

    const remove = (id: any) => rows(rows().filter((row: any) => row.id !== id));

    mount(() => ({
      tag: "table",
      props: {},
      children: [{
        tag: "tbody",
        props: {},
        children: [forEach(rows, (row: any) => ({
          tag: "tr",
          props: { key: row.id },
          children: [
            { tag: "td", props: { class: "col-md-1" }, children: [row.id] },
            {
              tag: "td", props: { class: "col-md-4" }, children: [
                { tag: "a", props: { class: "lbl" }, on: { click: () => selected(row.id) }, children: [row.label] }
              ]
            },
            {
              tag: "td", props: { class: "col-md-1" }, children: [
                { tag: "a", props: { class: "remove" }, on: { click: () => remove(row.id) }, children: ["×"] }
              ]
            }
          ]
        }))]
      }]
    }));

    flush();

    // Click row with id 2 to select it
    (document.querySelector(".lbl") as HTMLElement).click();
    flush();
    expect(selected()).toBe(1);

    const list = [...rows()];
    let item = list[0];
    list[0] = list[1];
    list[1] = item;
    rows(list);
    flush();

    // Try to select the swapped row
    const links = Array.from(document.querySelectorAll(".lbl"));
    (links[1] as HTMLElement).click();
    flush();
    expect(selected()).toBe(1);
  });

  test("dynamic child renders as sibling after forEach", () => {
    const items = signal([1, 2, 3]);
    const tree = {
      tag: "$",
      children: [
        forEach(items, (item) => ({
          tag: "li",
          props: { key: item, class: "item" },
          children: [`Item ${item}`]
        })),
        () => items().length === 0 && {
          tag: "p",
          props: { class: "empty" },
          children: ["No items found"]
        }
      ]
    };

    mount(() => tree);

    expectListLength(3);
    expect(document.querySelector(".empty")).toBe(null);

    items([]);
    flush();
    expectListLength(0);
    expect(document.querySelector(".empty")).not.toBe(null);
    expect(document.querySelector(".empty")?.textContent).toBe("No items found");

    items([4, 5]);
    flush();
    expectListLength(2);
    expect(document.querySelector(".empty")).toBe(null);
  });

  test("dynamic child renders as sibling before forEach", () => {
    const items = signal([]);
    const tree = {
      tag: "$",
      children: [
        () => items().length === 0 && {
          tag: "p",
          props: { class: "empty" },
          children: ["No items found"]
        },
        forEach(items, (item) => ({
          tag: "li",
          props: { key: item, class: "item" },
          children: [`Item ${item}`]
        }))
      ]
    };

    mount(() => tree);

    expect(document.querySelector(".empty")).not.toBe(null);
    expect(document.querySelector(".empty")?.textContent).toBe("No items found");

    items([1, 2, 3]);
    flush();
    expectListLength(3);
    expect(document.querySelector(".empty")).toBe(null);
  });
});