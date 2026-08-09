import { describe, test, expect, beforeEach } from "bun:test";
import { flush, signal } from "@hellajs/core";
import {resetTestState} from "@utils/test-helpers.js";
import { mount, html } from "@hellajs/dom/bundle";
import type { HellaNode } from "@hellajs/dom";

beforeEach(() => {
  resetTestState();
});

describe("dom", () => {
  describe("mount", () => {
    test("mounts static HTML content", () => {
      mount(html`<div id="static">Hello</div>`);
      expect(document.getElementById("static")?.textContent).toBe("Hello");
    });

    test("creates nested element structures", () => {
      const nested = html`<div><span>Nested</span></div>` as HellaNode;
      expect(nested.children![0] as HellaNode).toHaveProperty("tag", "span");
    });

    test("wraps multiple root elements in fragment", () => {
      const multi = html`<div>A</div><div>B</div>` as HellaNode;
      expect(multi.tag).toBe("$");
      expect(multi.children!.length).toBe(2);
    });

    test("parses self-closing tags", () => {
      const selfClose = html`<input type="text" placeholder="Enter" />` as HellaNode;
      expect(selfClose.tag).toBe("input");
      expect(selfClose.props!.type).toBe("text");
    });

    test("sets boolean attributes to true", () => {
      const bool = html`<input disabled />` as HellaNode;
      expect(bool.props!.disabled).toBe(true);
    });

    test("renders reactive signals", () => {
      const count = signal(0);
      const className = signal("initial");

      mount(html`<div id="reactive" class=${className}>${count}</div>`);
      const el = document.getElementById("reactive")!;

      expect(el.textContent).toBe("0");
      expect(el.className).toBe("initial");

      count(42);
      flush();
      expect(el.textContent).toBe("42");

      className("updated");
      flush();
      expect(el.className).toBe("updated");
    });

    test("handles computed values", () => {
      const a = signal(1);
      const b = signal(2);

      mount(html`<div id="computed">${a} + ${b} = ${() => a() + b()}</div>`);
      const el = document.getElementById("computed")!;

      expect(el.textContent).toBe("1 + 2 = 3");

      a(10);
      b(20);
      flush();
      expect(el.textContent).toBe("10 + 20 = 30");
    });

    test("conditionals rendering", () => {
      const show = signal(true);

      mount(html`
        <div id="cond-container">
          <span id="toggle">${() => show() ? html`<b>Yes</b>` : html`<b>No</b>`}</span>
        </div>
      `);

      expect(document.querySelector("#toggle b")?.textContent).toBe("Yes");

      show(false);
      flush();
      expect(document.querySelector("#toggle b")?.textContent).toBe("No");
    });

    test("nullable values render as empty string", () => {
      const value = signal<string | null | undefined>("content");

      mount(html`
        <div>
          <span id="nullable">${() => value()}</span>
        </div>
      `);

      expect(document.getElementById("nullable")?.textContent).toBe("content");

      value(null);
      flush();
      expect(document.getElementById("nullable")?.textContent).toBe("");
      expect(document.getElementById("nullable")?.textContent).not.toContain("null");

      value(undefined);
      flush();
      expect(document.getElementById("nullable")?.textContent).toBe("");
    });

    test("static falsy values render as empty string", () => {
      mount(html`<div id="static-falsy">before${false}${null}${undefined}after</div>`);
      expect(document.getElementById("static-falsy")?.textContent).toBe("beforeafter");
    });

    test("signal with zero renders as '0'", () => {
      const zeroSig = signal(0);
      mount(html`<span id="zero">${zeroSig}</span>`);
      expect(document.getElementById("zero")?.textContent).toBe("0");
    });

    test("static and reactive props", () => {
      const isDisabled = signal(true);

      mount(html`
        <button
          id="prop-test"
          type="submit"
          data-custom="value"
          disabled=${() => isDisabled() ? "disabled" : false}
        >
          Submit
        </button>
      `);

      const btn = document.getElementById("prop-test") as HTMLButtonElement;
      expect(btn.getAttribute("type")).toBe("submit");
      expect(btn.getAttribute("data-custom")).toBe("value");
      expect(btn.hasAttribute("disabled")).toBe(true);

      isDisabled(false);
      flush();
      expect(btn.hasAttribute("disabled")).toBe(false);
    });

    test("null attribute is not set", () => {
      mount(html`<input id="null-prop" readonly=${null} />`);
      expect(document.getElementById("null-prop")?.hasAttribute("readonly")).toBe(false);
    });

    test("fragments render", () => {
      mount(html`
        <div id="frag-container">
          <span>Static 1</span><span>Static 2</span>
        </div>
      `);

      const container = document.getElementById("frag-container")!;
      expect(container.querySelectorAll("span").length).toBe(2);
    });

    test("dynamic fragments from signal items", () => {
      const items = signal(["a", "b"]);

      mount(html`
        <div id="frag-container">
          ${() => ({ tag: "$", children: items().map(i => ({ tag: "em", children: [i] })) })}
        </div>
      `);

      const container = document.getElementById("frag-container")!;
      expect(container.querySelectorAll("em").length).toBe(2);

      items(["x", "y", "z"]);
      flush();
      expect(container.querySelectorAll("em").length).toBe(3);
      expect(container.querySelectorAll("em")[2]?.textContent).toBe("z");
    });

    test("throws for selector that does not match any element", () => {
      expect(() => mount(html`<div>test</div>`, "#nonexistent")).toThrow('[dom] mount: target "#nonexistent" not found in document');
    });
  });
});