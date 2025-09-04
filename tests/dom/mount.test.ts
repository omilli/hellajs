import { describe, test, expect, beforeEach } from "bun:test";
import { mount } from "../../packages/dom";
import { signal, flush } from "../../packages/core";

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
});

describe("dom", () => {
  describe("mount", () => {
    test("mount text, vnode, DOM node, null, undefined, and function children", () => {
      // Text
      mount({ tag: "div", props: { id: "text" }, children: ["foo"] });
      expect(document.querySelector("#text")?.textContent).toBe("foo");

      // HellaNode
      mount({ tag: "div", props: { id: "vnode" }, children: [{ tag: "span", props: {}, children: ["bar"] }] });
      expect(document.querySelector("#vnode span")?.textContent).toBe("bar");

      // null/undefined
      mount({ tag: "div", props: { id: "nulltest" }, children: [null, undefined] });
      const nullDiv = document.querySelector("#nulltest");
      expect(Array.from(nullDiv?.childNodes ?? []).every(n => n.nodeType === Node.COMMENT_NODE)).toBe(true);

      // Function child returning text
      mount({ tag: "div", props: { id: "functext" }, children: [() => "dynamic text"] });
      expect(document.querySelector("#functext")?.textContent).toBe("dynamic text");

      // Function child returning vnode
      mount({ tag: "div", props: { id: "funcvnode" }, children: [() => ({ tag: "span", props: {}, children: ["dynamic vnode"] })] });
      expect(document.querySelector("#funcvnode span")?.textContent).toBe("dynamic vnode");
    });

    test("update on signal change", () => {
      const count = signal<number>(0);
      mount(() => ({ tag: "div", props: { id: "signaltest" }, children: [count] }));
      expect(document.querySelector("#signaltest")?.textContent).toBe("0");
      count(5);
      flush();
      expect(document.querySelector("#signaltest")?.textContent).toBe("5");
    });

    test("set standard DOM properties and attributes", () => {
      mount({ tag: "input", props: { value: "foo", type: "text", custom: "bar" }, children: [] });
      const input = document.querySelector("input");
      expect(input?.value).toBe("foo");
      expect(input?.getAttribute("type")).toBe("text");
      expect(input?.getAttribute("custom")).toBe("bar");
    });

    test("update dynamic DOM properties and attributes", () => {
      const fooClass = signal<string>("foo");
      mount({ tag: "input", props: { class: fooClass }, children: [] });
      const input = document.querySelector("input");
      expect(input?.className).toBe("foo");
      fooClass("bar");
      flush();
      expect(input?.className).toBe("bar");
    });

    test("attach event handlers", () => {
      let called: boolean = false;
      mount({ tag: "input", props: { onblur: () => { called = true; } }, children: [] });
      const input = document.querySelector("input");
      input?.dispatchEvent(new Event("blur"));
      expect(called).toBe(true);
    });

    test("render fragment ($) with multiple children", () => {
      mount({
        tag: "div",
        props: { id: "fragment" },
        children: [
          {
            tag: "$",
            props: {},
            children: [
              { tag: "span", props: {}, children: ["a"] },
              { tag: "span", props: {}, children: ["b"] },
              { tag: "span", props: {}, children: ["c"] }
            ]
          }
        ]
      });
      const div = document.getElementById("fragment");
      expect(div?.children.length).toBe(3);
      expect(div?.children[0]?.textContent).toBe("a");
      expect(div?.children[1]?.textContent).toBe("b");
      expect(div?.children[2]?.textContent).toBe("c");
    });


    test("call onUpdate lifecycle hook", () => {
      let updateCalled: number = 0;
      const count = signal<number>(0);
      mount(() => ({
        tag: "div",
        props: {
          onUpdate: () => { updateCalled++; }
        },
        children: [count]
      }));

      count(1);
      flush();
      expect(updateCalled).toBeGreaterThan(0);
    });

    test("stores onDestroy lifecycle hook", () => {
      let updateCalled: number = 0;
      mount({
        tag: "div",
        props: {
          id: "test",
          onDestroy: () => { updateCalled++; }
        },
        children: ["test"]
      });

      const element = document.querySelector("#test") as Element & { onDestroy?: () => void };
      element?.onDestroy?.();
      expect(updateCalled).toBeGreaterThan(0);
    });

    test("handles nodes without children property", () => {
      mount({
        tag: "div",
        props: { id: "no-children" }
      } as any);
      const div = document.getElementById("no-children");
      expect(div).toBeTruthy();
      expect(div?.children.length).toBe(0);
    });

    test("handles nodes with empty children array", () => {
      mount({
        tag: "div",
        props: { id: "empty-children" },
        children: []
      });
      const div = document.getElementById("empty-children");
      expect(div).toBeTruthy();
      expect(div?.children.length).toBe(0);
    });

    test("handles fragments without children property", () => {
      mount({
        tag: "div",
        props: { id: "fragment-test" },
        children: [{
          tag: "$"
        } as any]
      });
      const div = document.getElementById("fragment-test");
      expect(div).toBeTruthy();
      expect(div?.children.length).toBe(0);
    });
  });
});
