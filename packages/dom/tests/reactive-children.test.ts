import { describe, test, expect, beforeEach } from "bun:test";
import { flush, signal } from "@hellajs/core";
import { resetTestState, setupContainer } from "@utils/test-helpers.js";
import { mount, hydrate, html, component, ForEach } from "@hellajs/dom/bundle";
import type { HellaChildren, HellaNode, ComponentFn } from "@hellajs/dom";

beforeEach(() => {
  resetTestState();
});

// The vendored-component codegen shape: children re-interpolated through a runtime html template
const Box = (props: { children?: HellaChildren }): HellaNode =>
  html`<div id="box">${() => props.children}</div>` as HellaNode;

describe("dom", () => {
  describe("reactive children", () => {
    test("renders a function child returning a node through a component child slot", () => {
      mount(html`<${Box}>${() => html`<b>sync</b>`}</${Box}>`);

      expect(document.getElementById("box")!.innerHTML).toBe("<b>sync</b>");
    });

    test("renders a function child returning a node array through a component child slot", () => {
      const rows = ["a", "b", "c"];

      mount(html`<${Box}>${() => rows.map((row) => html`<p>${row}</p>`)}</${Box}>`);

      expect(document.getElementById("box")!.textContent).toBe("abc");
      expect(document.getElementById("box")!.querySelectorAll("p").length).toBe(3);
    });

    test("renders the JSX compile shape (children array) identically", () => {
      mount(component(Box as ComponentFn, { children: [() => html`<i>jsx</i>`] }));

      expect(document.getElementById("box")!.innerHTML).toBe("<i>jsx</i>");
    });

    test("swaps component-slot child nodes when the source signal changes", () => {
      const items = signal(["one", "two"]);

      mount(html`<${Box}>${() => items().map((item) => html`<p>${item}</p>`)}</${Box}>`);
      const box = document.getElementById("box")!;
      expect(box.textContent).toBe("onetwo");

      items(["one", "two", "three"]);
      flush();
      expect(box.textContent).toBe("onetwothree");
      expect(box.querySelectorAll("p").length).toBe(3);

      items(["one"]);
      flush();
      expect(box.textContent).toBe("one");
      expect(box.querySelectorAll("p").length).toBe(1);
    });

    test("renders a function child resolving to an isDynamic component through a component slot", () => {
      const items = signal(["x", "y"]);

      mount(html`<${Box}>${() => ForEach({ each: () => items(), use: (item: string) => html`<span>${item}</span>` })}</${Box}>`);
      const box = document.getElementById("box")!;
      expect(box.textContent).toBe("xy");

      items(["x", "y", "z"]);
      flush();
      expect(box.textContent).toBe("xyz");
    });

    test("keeps reactive text children inside children arrays as text, in place", () => {
      const count = signal(7);

      mount(component(Box as ComponentFn, { children: [() => count()] }));
      const box = document.getElementById("box")!;
      expect(box.textContent).toBe("7");
      const textNode = box.firstChild!;
      expect(textNode.nodeType).toBe(Node.TEXT_NODE);

      count(8);
      flush();
      expect(box.textContent).toBe("8");
      expect(box.firstChild).toBe(textNode);
    });

    test("hydrates a component-slot reactive region and re-renders on signal change", () => {
      const items = signal(["a", "b"]);
      const container = setupContainer();
      container.innerHTML = '<div id="box"><!--[--><p>a</p><p>b</p><!--]--></div>';

      hydrate(html`<${Box}>${() => items().map((item) => html`<p>${item}</p>`)}</${Box}>`, container);
      const box = container.querySelector("#box")!;
      expect(box.querySelectorAll("p").length).toBe(2);

      items(["a", "b", "c"]);
      flush();
      expect(box.querySelectorAll("p").length).toBe(3);
      expect(box.textContent).toBe("abc");
    });
  });
});
