import { describe, test, expect, beforeEach } from "bun:test";
import { flush, signal } from "@hellajs/core";
import { resetTestState, setupContainer } from "@utils/test-helpers.js";
import { mount, html, peekState } from "@hellajs/dom/bundle";
import { fallbackHandler } from "./helpers";

beforeEach(() => {
  resetTestState();
});

describe("dom", () => {
  describe("mount binding", () => {
    test("value set via direct property with falsy fallback", () => {
      const inputValue = signal("hello");

      mount(html`
        <div>
          <input id="val-input" value=${inputValue} />
        </div>
      `);

      const valInput = document.getElementById("val-input") as HTMLInputElement;

      expect(valInput.value).toBe("hello");

      inputValue("");
      flush();

      expect(valInput.value).toBe("");

      inputValue("restored");
      flush();
      expect(valInput.value).toBe("restored");
    });

    test("innerHTML set via direct property with falsy fallback", () => {
      const content = signal<string | null>("<b>bold</b>");

      mount(html`<div id="html-div" innerHTML=${content}></div>`);

      const el = document.getElementById("html-div")!;
      expect(el.querySelector("b")?.textContent).toBe("bold");

      content(null);
      flush();
      expect(el.innerHTML).toBe("");

      content("<i>italic</i>");
      flush();
      expect(el.querySelector("i")?.textContent).toBe("italic");
    });
  });

  describe("runtime prop detection", () => {
    test("a bare signal prop updates the attribute reactively", () => {
      const className = signal("first");
      mount(html`<div id="rt" class=${className}></div>`);
      const el = document.getElementById("rt")!;
      expect(el.className).toBe("first");

      className("second");
      flush();
      expect(el.className).toBe("second");
    });

    test("an explicit wrapper prop is reactive", () => {
      const active = signal(false);
      mount(html`<div id="rt" data-state=${() => (active() ? "on" : "off")}></div>`);
      const el = document.getElementById("rt")!;
      expect(el.getAttribute("data-state")).toBe("off");

      active(true);
      flush();
      expect(el.getAttribute("data-state")).toBe("on");
    });

    test("a static (non-function) prop is applied once and registers no effect", () => {
      mount(html`<div id="rt" title="static-value"></div>`);
      const el = document.getElementById("rt")!;
      expect(el.getAttribute("title")).toBe("static-value");
      expect(peekState(el)?.effects).toBeUndefined();
    });

    test("a function-ref prop registers an effect on the element", () => {
      const className = signal("a");
      mount(html`<div id="rt" class=${className}></div>`);
      const el = document.getElementById("rt")!;
      expect(peekState(el)?.effects?.length).toBe(1);
    });

    test("a function-ref prop that throws dispatches to error:fallback at phase update", () => {
      fallbackHandler();
      const container = setupContainer();
      const shouldThrow = signal(false);
      mount(
        html`
          <div error:fallback=${() => html`<span>Caught</span>`}>
            <span id="rt" data-x=${() => {
              if (shouldThrow()) throw new Error("prop");
              return "ok";
            }}></span>
          </div>
        `,
        container
      );
      expect(container.querySelector("#rt")!.getAttribute("data-x")).toBe("ok");

      shouldThrow(true);
      flush();
      expect(container.textContent).toBe("Caught");
    });
  });
});
