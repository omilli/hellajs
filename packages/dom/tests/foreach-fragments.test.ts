import { describe, test, expect, beforeEach } from "bun:test";
import { flush, signal } from "@hellajs/core";
import { resetTestState } from "@utils/test-helpers.js";
import { mount, html } from "@hellajs/dom/bundle";
import type { HellaNode } from "@hellajs/dom";
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
  describe("foreach fragments", () => {
    test("handles fragments and nested structures", () => {
      const items = signal([1, 2]);
      const fragmentRenderer = (item: number) => html`<li>Item ${item}</li><span>(${item})</span>` as HellaNode;

      mount(() => createList(items, fragmentRenderer));
      expect(document.querySelectorAll("li").length).toBe(2);
      expect(document.querySelectorAll("span").length).toBe(2);
    });

    test("removes stale fragment items when the list shrinks", () => {
      const items = signal([1, 2, 3]);
      const fragmentRenderer = (item: number) => html`<li>item ${item}</li><li>detail ${item}</li>` as HellaNode;

      mount(() => createList(items, fragmentRenderer));
      expect(getListTexts()).toEqual(["item 1", "detail 1", "item 2", "detail 2", "item 3", "detail 3"]);

      items([1]);
      flush();
      expect(getListTexts()).toEqual(["item 1", "detail 1"]);
    });

    test("reorders fragment items on permutation", () => {
      const items = signal<TestItem[]>([{ id: 1, name: "A" }, { id: 2, name: "B" }, { id: 3, name: "C" }]);
      const fragmentRenderer = (item: TestItem) => html`<li>${item.name}</li><span>(${item.name})</span>` as HellaNode;

      mount(() => createList(items, fragmentRenderer));
      const liNodes = Array.from(document.querySelectorAll("li"));

      items([{ id: 3, name: "C" }, { id: 1, name: "A" }]);
      flush();

      expect(getListTexts()).toEqual(["C", "A"]);
      expect(Array.from(document.querySelectorAll("span")).map(span => span.textContent)).toEqual(["(C)", "(A)"]);

      const reorderedNodes = Array.from(document.querySelectorAll("li"));
      expect(reorderedNodes[0]).toBe(liNodes[2]);
      expect(reorderedNodes[1]).toBe(liNodes[0]);
    });

    test("replaces index-keyed fragment items when the item reference changes", () => {
      const items = signal([1, 2]);
      const fragmentRenderer = (item: number) => html`<li>item ${item}</li><li>detail ${item}</li>` as HellaNode;

      mount(() => createList(items, fragmentRenderer));
      const staleNodes = Array.from(document.querySelectorAll("li"));
      expect(staleNodes.length).toBe(4);

      items([9, 7]);
      flush();

      expect(getListTexts()).toEqual(["item 9", "detail 9", "item 7", "detail 7"]);
      const freshNodes = Array.from(document.querySelectorAll("li"));
      expect(freshNodes.length).toBe(4);
      expect(freshNodes.includes(staleNodes[0]!)).toBe(false);
      expect(freshNodes.includes(staleNodes[3]!)).toBe(false);
    });

    test("disposes element effects inside fragment items on removal", () => {
      const keep = signal("keep");
      const drop = signal("drop");
      interface ReactiveFragmentRow { id: number; label: Signal<string>; }
      const items = signal<ReactiveFragmentRow[]>([{ id: 1, label: keep }, { id: 2, label: drop }]);
      const fragmentRenderer = (row: ReactiveFragmentRow) => html`<li>${row.label}</li><span>${row.label}</span>` as HellaNode;

      mount(() => createList(items, fragmentRenderer));
      expect(getListTexts()).toEqual(["keep", "drop"]);
      const removedLi = Array.from(document.querySelectorAll("li"))[1]!;

      items([{ id: 1, label: keep }]);
      flush();
      expect(getListTexts()).toEqual(["keep"]);

      drop("dropped");
      flush();
      expect(removedLi.textContent).toBe("drop");

      keep("kept!");
      flush();
      expect(getListTexts()).toEqual(["kept!"]);
    });

    test("reconciles a list mixing element items and fragment items", () => {
      interface MixedItem { id: number; kind: "elem" | "frag"; }
      const items = signal<MixedItem[]>([
        { id: 1, kind: "frag" },
        { id: 2, kind: "elem" },
        { id: 3, kind: "frag" },
        { id: 4, kind: "elem" }
      ]);
      const mixedRenderer = (item: MixedItem) =>
        item.kind === "elem"
          ? html`<li class="elem">E${item.id}</li>` as HellaNode
          : html`<li class="frag">F${item.id}</li><span>f${item.id}</span>` as HellaNode;

      mount(() => createList(items, mixedRenderer));
      expect(getListTexts()).toEqual(["F1", "E2", "F3", "E4"]);
      expect(document.querySelectorAll("span").length).toBe(2);

      items([{ id: 1, kind: "frag" }, { id: 4, kind: "elem" }]);
      flush();
      expect(getListTexts()).toEqual(["F1", "E4"]);
      expect(document.querySelectorAll("span").length).toBe(1);

      items([{ id: 4, kind: "elem" }, { id: 1, kind: "frag" }]);
      flush();
      expect(getListTexts()).toEqual(["E4", "F1"]);
      expect(document.querySelectorAll("span").length).toBe(1);

      items([{ id: 9, kind: "frag" }, { id: 8, kind: "elem" }]);
      flush();
      expect(getListTexts()).toEqual(["F9", "E8"]);
      expect(document.querySelectorAll("span").length).toBe(1);
    });
  });
});
