import { describe, test, expect, beforeEach } from "vite-plus/test";
import { flush, signal } from "@hellajs/core";
import { resetTestState, setupContainer } from "@utils/test-helpers.js";
import { mount, peekState } from "@hellajs/dom";
import { fallbackHandler } from "./helpers";

beforeEach(() => {
  resetTestState();
});

describe("dom", () => {
  describe("prop reactivity", () => {
    test("a bare signal prop updates the attribute reactively", () => {
      const className = signal("first");
      mount(<div id="rt" class={className}></div>);
      const el = document.getElementById("rt")!;
      expect(el.className).toBe("first");

      className("second");
      flush();
      expect(el.className).toBe("second");
    });

    test("an explicit wrapper prop is reactive", () => {
      const active = signal(false);
      mount(<div id="rt" data-state={() => (active() ? "on" : "off")}></div>);
      const el = document.getElementById("rt")!;
      expect(el.getAttribute("data-state")).toBe("off");

      active(true);
      flush();
      expect(el.getAttribute("data-state")).toBe("on");
    });

    test("a static (non-function) prop is applied once and registers no effect", () => {
      mount(<div id="rt" title="static-value"></div>);
      const el = document.getElementById("rt")!;
      expect(el.getAttribute("title")).toBe("static-value");
      expect(peekState(el)?.effects).toBeUndefined();
    });

    test("a function-ref prop registers an effect on the element", () => {
      const className = signal("a");
      mount(<div id="rt" class={className}></div>);
      const el = document.getElementById("rt")!;
      expect(peekState(el)?.effects?.length).toBe(1);
    });

    test("a function-ref prop that throws dispatches to error:fallback at phase update", () => {
      fallbackHandler();
      const container = setupContainer();
      const shouldThrow = signal(false);
      mount(
        <div error:fallback={() => <span>Caught</span>}>
          <span
            id="rt"
            data-x={() => {
              if (shouldThrow()) throw new Error("prop");
              return "ok";
            }}
          ></span>
        </div>,
        container,
      );
      expect(container.querySelector("#rt")!.getAttribute("data-x")).toBe("ok");

      shouldThrow(true);
      flush();
      expect(container.textContent).toBe("Caught");
    });
  });
});
