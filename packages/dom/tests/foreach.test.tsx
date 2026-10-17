import { describe, test, expect, beforeEach } from "vite-plus/test";
import { flush, signal } from "@hellajs/core";
import { resetTestState } from "@utils/test-helpers.js";
import { mount, ForEach, peekState } from "@hellajs/dom";
import type { Signal } from "@hellajs/core";
import { createList, getListTexts } from "./helpers";

interface TestItem {
  id: number;
  name?: string;
  label?: string;
}

beforeEach(() => {
  resetTestState();
});

describe("dom", () => {
  describe("ForEach", () => {
    test("renders, updates, and reorders lists", () => {
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

      items([5, 6]);
      flush();
      expect(getListTexts()).toEqual(["Item 5", "Item 6"]);
    });

    test("renders and updates a list through the html ForEach syntax", () => {
      const items = signal(["a", "b", "c"]);

      mount(
        <ul>
          <ForEach each={items} use={(item: string) => <li>{item}</li>}></ForEach>
        </ul>,
      );

      expect(getListTexts()).toEqual(["a", "b", "c"]);

      items(["x", "y"]);
      flush();
      expect(getListTexts()).toEqual(["x", "y"]);
    });

    test("updates list with keyless items using index fallback", () => {
      const items = signal(["a", "b", "c"]);
      mount(
        <ul>
          <ForEach each={items} use={(item: string) => <li>{item}</li>}></ForEach>
        </ul>,
      );

      expect(getListTexts()).toEqual(["a", "b", "c"]);

      items(["b", "a", "c"]);
      flush();
      expect(getListTexts()).toEqual(["b", "a", "c"]);

      items(["x", "y"]);
      flush();
      expect(getListTexts()).toEqual(["x", "y"]);
    });

    test("empty-to-empty update is a no-op", () => {
      const items = signal<number[]>([]);
      mount(() => createList(items));

      const commentsBefore = Array.from(document.querySelector("ul")!.childNodes).filter(
        (n) => n.nodeType === Node.COMMENT_NODE,
      ).length;
      expect(commentsBefore).toBe(0);

      items([]);
      flush();

      const commentsAfter = Array.from(document.querySelector("ul")!.childNodes).filter(
        (n) => n.nodeType === Node.COMMENT_NODE,
      ).length;
      expect(commentsAfter).toBe(0);
      expect(document.querySelectorAll("li").length).toBe(0);
    });

    test("duplicate keys keep last-wins semantics", () => {
      const items = signal([1, 2, 1]);
      mount(() => createList(items));

      expect(getListTexts()).toEqual(["Item 1", "Item 2", "Item 1"]);

      items([1, 1, 3]);
      flush();
      expect(getListTexts()).toEqual(["Item 1", "Item 1", "Item 3"]);
    });

    test("LIS algorithm minimizes moves", () => {
      const items = signal([1, 2, 3, 4, 5]);
      mount(() => createList(items));
      expect(document.querySelectorAll("li").length).toBe(5);

      items([3, 1, 2, 5, 4]);
      flush();
      expect(getListTexts()).toEqual(["Item 3", "Item 1", "Item 2", "Item 5", "Item 4"]);
    });

    test("uses item.id as fallback key", () => {
      const alice = { id: 1, name: "Alice" };
      const bob = { id: 2, name: "Bob" };
      const charlie = { id: 3, name: "Charlie" };
      const items = signal<TestItem[]>([alice, bob, charlie]);

      const renderer = (item: TestItem) => <li>{item.name}</li>;
      mount(() => createList(items, renderer));

      expect(getListTexts()).toEqual(["Alice", "Bob", "Charlie"]);

      const liNodes = Array.from(document.querySelectorAll("li"));
      const aliceNode = liNodes[0];
      const bobNode = liNodes[1];
      const charlieNode = liNodes[2];

      items([charlie, alice, bob]);
      flush();

      const reorderedNodes = Array.from(document.querySelectorAll("li"));
      expect(getListTexts()).toEqual(["Charlie", "Alice", "Bob"]);

      expect(reorderedNodes[0]).toBe(charlieNode);
      expect(reorderedNodes[1]).toBe(aliceNode);
      expect(reorderedNodes[2]).toBe(bobNode);

      items([alice, charlie, bob]);
      flush();

      const swappedNodes = Array.from(document.querySelectorAll("li"));
      expect(swappedNodes[0]).toBe(aliceNode);
      expect(swappedNodes[1]).toBe(charlieNode);
      expect(swappedNodes[2]).toBe(bobNode);
    });

    test("uses item.id as fallback key for non-HellaNode use return", () => {
      const alice = { id: 1, name: signal("Alice") };
      const bob = { id: 2, name: signal("Bob") };
      const items = signal([alice, bob]);

      mount(
        <ul>
          <ForEach each={items} use={(item: typeof alice) => item.name}></ForEach>
        </ul>,
      );

      expect(document.querySelector("ul")?.textContent).toBe("AliceBob");

      items([bob, alice]);
      flush();

      expect(document.querySelector("ul")?.textContent).toBe("BobAlice");
    });

    test("updates non-HellaNode keyless items using index fallback", () => {
      const items = signal(["a", "b", "c"]);
      mount(
        <ul>
          <ForEach each={items} use={(item: string) => item}></ForEach>
        </ul>,
      );

      expect(document.querySelector("ul")?.textContent).toBe("abc");

      items(["x", "y"]);
      flush();
      expect(document.querySelector("ul")?.textContent).toBe("xy");

      items(["b", "a"]);
      flush();
      expect(document.querySelector("ul")?.textContent).toBe("ba");
    });

    test("replacement fast paths handle complete and zero-overlap swaps", () => {
      const items = signal<TestItem[]>([
        { id: 1, name: "A" },
        { id: 2, name: "B" },
      ]);
      const renderer = (item: TestItem) => <li key={item.id}>{item.name}</li>;

      mount(() => createList(items, renderer));
      expect(getListTexts()).toEqual(["A", "B"]);

      items([
        { id: 10, name: "X" },
        { id: 20, name: "Y" },
        { id: 30, name: "Z" },
      ]);
      flush();
      expect(getListTexts()).toEqual(["X", "Y", "Z"]);

      items([
        { id: 100, name: "P" },
        { id: 200, name: "Q" },
      ]);
      flush();
      expect(getListTexts()).toEqual(["P", "Q"]);
    });

    test("no-change skips DOM mutations when items are identical", () => {
      const items = signal([1, 2, 3]);
      mount(() => createList(items));

      const liNodes = Array.from(document.querySelectorAll("li"));
      expect(liNodes.length).toBe(3);

      items([1, 2, 3]);
      flush();

      const afterNodes = Array.from(document.querySelectorAll("li"));
      expect(afterNodes[0]).toBe(liNodes[0]);
      expect(afterNodes[1]).toBe(liNodes[1]);
      expect(afterNodes[2]).toBe(liNodes[2]);
      expect(getListTexts()).toEqual(["Item 1", "Item 2", "Item 3"]);
    });

    test("clears large lists efficiently", () => {
      const buildData = (start: number, count: number): TestItem[] =>
        Array.from({ length: count }, (_, i) => ({ id: start + i, label: `Item ${start + i}` }));

      const items = signal(buildData(1, 100));
      mount(
        <div>
          <ForEach
            each={items}
            use={(item: TestItem) => (
              <div key={item.id} class="item">
                {item.label}
              </div>
            )}
          ></ForEach>
        </div>,
      );

      expect(document.querySelectorAll(".item").length).toBe(100);

      items([...items(), ...buildData(101, 100)]);
      flush();
      expect(document.querySelectorAll(".item").length).toBe(200);

      items([]);
      flush();
      expect(document.querySelectorAll(".item").length).toBe(0);
    });

    test("repopulates after a full clear", () => {
      const items = signal<number[]>([1, 2]);
      mount(() => createList(items));

      items([]);
      flush();
      expect(getListTexts()).toEqual([]);

      items([3, 4]);
      flush();
      expect(getListTexts()).toEqual(["Item 3", "Item 4"]);
    });

    test("clear preserves foreign siblings in the list parent", () => {
      const items = signal<number[]>([1, 2]);
      mount(
        <ul id="mixed">
          <li id="foreign">keep</li>
          <ForEach each={items} use={(item: number) => <li key={item}>{item}</li>}></ForEach>
        </ul>,
      );

      items([]);
      flush();
      expect(document.getElementById("foreign")?.textContent).toBe("keep");
      expect(document.querySelectorAll("#mixed li").length).toBe(1);
    });

    test("key-only reconciliation reuses DOM nodes and preserves signal children", () => {
      const name1 = signal("Alice");
      const name2 = signal("Bob");
      interface ReactiveItem {
        id: number;
        name: typeof name1;
      }
      const items = signal<ReactiveItem[]>([
        { id: 1, name: name1 },
        { id: 2, name: name2 },
      ]);

      mount(
        <ul>
          <ForEach
            each={items}
            use={(item: ReactiveItem) => <li key={item.id}>{item.name}</li>}
          ></ForEach>
        </ul>,
      );

      expect(getListTexts()).toEqual(["Alice", "Bob"]);
      const firstNodes = Array.from(document.querySelectorAll("li"));

      name1("ALICE");
      flush();
      expect(getListTexts()).toEqual(["ALICE", "Bob"]);

      items([
        { id: 1, name: name1 },
        { id: 2, name: name2 },
      ]);
      flush();

      const reusedNodes = Array.from(document.querySelectorAll("li"));
      expect(reusedNodes[0]).toBe(firstNodes[0]);
      expect(reusedNodes[1]).toBe(firstNodes[1]);

      name2("BOB");
      flush();
      expect(getListTexts()).toEqual(["ALICE", "BOB"]);
    });

    test("renders explicit-key items without a key attribute and reuses nodes through prepend and reorder", () => {
      interface KeyedItem {
        uid: number;
        name: string;
      }
      const items = signal<KeyedItem[]>([
        { uid: 1, name: "A" },
        { uid: 2, name: "B" },
        { uid: 3, name: "C" },
      ]);
      const renderer = (item: KeyedItem) => <li key={item.uid}>{item.name}</li>;

      mount(() => createList(items, renderer));
      expect(getListTexts()).toEqual(["A", "B", "C"]);
      expect(document.querySelector("li")!.outerHTML).toBe("<li>A</li>");
      const mountedNodes = Array.from(document.querySelectorAll("li"));
      const nodeByName = new Map(mountedNodes.map((li) => [li.textContent, li]));

      items([
        { uid: 0, name: "Z" },
        { uid: 1, name: "A" },
        { uid: 2, name: "B" },
        { uid: 3, name: "C" },
      ]);
      flush();
      expect(getListTexts()).toEqual(["Z", "A", "B", "C"]);
      const afterPrepend = Array.from(document.querySelectorAll("li"));
      expect(afterPrepend[1]).toBe(nodeByName.get("A"));
      expect(afterPrepend[3]).toBe(nodeByName.get("C"));

      items([
        { uid: 3, name: "C" },
        { uid: 0, name: "Z" },
        { uid: 2, name: "B" },
        { uid: 1, name: "A" },
      ]);
      flush();
      expect(getListTexts()).toEqual(["C", "Z", "B", "A"]);
      const afterReorder = Array.from(document.querySelectorAll("li"));
      expect(afterReorder[0]).toBe(nodeByName.get("C"));
      expect(afterReorder[3]).toBe(nodeByName.get("A"));
    });

    test("renders a spread-carried key without an attribute and reuses nodes by key", () => {
      interface KeyedItem {
        uid: number;
        name: string;
      }
      const items = signal<KeyedItem[]>([
        { uid: 1, name: "A" },
        { uid: 2, name: "B" },
      ]);
      const renderer = (item: KeyedItem) => {
        const attrs = { key: item.uid, class: "item" };
        return <li {...attrs}>{item.name}</li>;
      };

      mount(() => createList(items, renderer));
      expect(getListTexts()).toEqual(["A", "B"]);
      expect(document.querySelector("li")!.outerHTML).toBe('<li class="item">A</li>');
      const nodeA = Array.from(document.querySelectorAll("li"))[0];

      items([
        { uid: 2, name: "B" },
        { uid: 1, name: "A" },
      ]);
      flush();
      expect(getListTexts()).toEqual(["B", "A"]);
      expect(Array.from(document.querySelectorAll("li"))[1]).toBe(nodeA);
    });

    test("renders no key attribute for a keyed element mounted outside ForEach", () => {
      mount(
        <div id="solo" key="solo-key">
          x
        </div>,
      );
      expect(document.getElementById("solo")!.outerHTML).toBe('<div id="solo">x</div>');
    });

    test("preserves sibling elements during updates", () => {
      const items = signal([1, 2]);
      const showEmpty = signal(false);

      mount(
        <div class="wrapper">
          <ForEach each={items} use={(item: number) => <div class="item">{item}</div>}></ForEach>
          <p class="footer">Always visible</p>
          {() => showEmpty() && <p class="empty">No items</p>}
        </div>,
      );

      expect(document.querySelectorAll(".item").length).toBe(2);
      expect(document.querySelector(".footer")?.textContent).toBe("Always visible");

      items([]);
      showEmpty(true);
      flush();

      expect(document.querySelectorAll(".item").length).toBe(0);
      expect(document.querySelector(".footer")).not.toBeNull();
      expect(document.querySelector(".empty")?.textContent).toBe("No items");
    });

    test("dynamic signals update independently", () => {
      const signals = [signal("A"), signal("B")];
      mount(
        <span>
          <ForEach each={signals} use={(item: (typeof signals)[0]) => item}></ForEach>
        </span>,
      );

      expect(document.querySelector("span")?.textContent).toBe("AB");

      signals[0]?.("X");
      flush();
      expect(document.querySelector("span")?.textContent).toBe("XB");
    });

    test("throws when each is missing", () => {
      expect(() =>
        ForEach(
          // @ts-expect-error — intentionally invalid: missing each
          { use: (item: unknown) => item },
        ),
      ).toThrow("[dom] ForEach: each is required");
    });

    test("throws when use is not a function", () => {
      expect(() =>
        ForEach(
          // @ts-expect-error — intentionally invalid: use is not a function
          { each: [], use: "not a function" },
        ),
      ).toThrow("[dom] ForEach: use must be a function");
    });

    test("swap operations with reactive content", () => {
      interface ReactiveRow {
        id: number;
        label: Signal<string>;
      }
      const rows = signal<ReactiveRow[]>([
        { id: 1, label: signal("Item 1") },
        { id: 2, label: signal("Item 2") },
      ]);
      const selected = signal<number | undefined>(undefined);

      mount(
        <table>
          <tbody>
            <ForEach
              each={rows}
              use={(row: ReactiveRow) => (
                <tr key={row.id}>
                  <td>{row.id}</td>
                  <td>
                    <a class="lbl" on:click={() => selected(row.id)}>
                      {row.label}
                    </a>
                  </td>
                </tr>
              )}
            ></ForEach>
          </tbody>
        </table>,
      );

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

    test("clears 300 effected rows and repopulates without stale state", () => {
      const rows = signal(
        Array.from({ length: 300 }, (_, i) => ({ id: i, label: signal(`Row ${i}`) })),
      );

      mount(
        <ul>
          <ForEach
            each={rows}
            use={(row: { id: number; label: Signal<string> }) => (
              <li key={row.id} class="row" on:click={() => row.label(`clicked ${row.id}`)}>
                {row.label}
              </li>
            )}
          ></ForEach>
        </ul>,
      );
      expect(document.querySelectorAll(".row").length).toBe(300);
      const cleared = [...document.querySelectorAll(".row")] as HTMLElement[];

      rows([]);
      flush();

      expect(document.querySelectorAll(".row").length).toBe(0);
      expect(cleared.every((li) => peekState(li) === undefined)).toBe(true);

      rows(Array.from({ length: 300 }, (_, i) => ({ id: i, label: signal(`New ${i}`) })));
      flush();

      expect(document.querySelectorAll(".row").length).toBe(300);
      expect(getListTexts()[0]).toBe("New 0");
    });
  });
});
