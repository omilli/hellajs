import { describe, test, expect, beforeEach } from "vite-plus/test";
import { flush, signal, batch } from "@hellajs/core";
import { resetTestState } from "@utils/test-helpers.js";
import { mount } from "@hellajs/dom";
import type { TemplateBuildFn } from "@hellajs/dom";

beforeEach(() => {
  resetTestState();
});

describe("dom", () => {
  describe("mount", () => {
    test("mounts inside a batch and renders when the batch exits", () => {
      batch(() => {
        mount(<div id="in-batch">b</div>);
      });
      expect(document.getElementById("in-batch")?.textContent).toBe("b");
    });
    test("mounts static HTML content", () => {
      mount(<div id="static">Hello</div>);
      expect(document.getElementById("static")?.textContent).toBe("Hello");
    });

    test("a shared static vnode mounts as a distinct clone per mount", () => {
      // the shape the babel plugin emits for fully-static subtrees:
      // one module-level hoisted object, `static: true`, mounted many times
      const shared = (
        <div id="shared" class="box">
          static text<span>nested</span>
        </div>
      );

      const hostA = document.createElement("div");
      const hostB = document.createElement("div");
      document.body.append(hostA, hostB);

      const a = mount(shared, hostA);
      const b = mount(shared, hostB);

      const elA = document.getElementById("shared");
      const els = document.querySelectorAll("#shared");
      expect(els.length).toBe(2);
      expect(elA?.textContent).toBe("static textnested");
      expect(elA?.getAttribute("class")).toBe("box");

      // clones are distinct — removing one mount leaves the other intact
      a.unmount();
      expect(document.querySelectorAll("#shared").length).toBe(1);
      expect(b.container.textContent).toBe("static textnested");
    });

    test("creates nested element structures", () => {
      mount(
        <div id="nested-root">
          <span>Nested</span>
        </div>,
      );
      expect(document.querySelector("#nested-root > span")?.textContent).toBe("Nested");
    });

    test("wraps multiple root elements in fragment", () => {
      const multi = (
        <>
          <div>A</div>
          <div>B</div>
        </>
      );
      expect((multi as unknown as TemplateBuildFn).isTemplate).toBe(true);
      mount(<div id="frag-host">{multi}</div>);
      expect(document.getElementById("frag-host")?.textContent).toBe("AB");
    });

    test("parses self-closing tags", () => {
      mount(<input id="self-close" type="text" placeholder="Enter" />);
      const el = document.getElementById("self-close") as HTMLInputElement;
      expect(el.tagName).toBe("INPUT");
      expect(el.getAttribute("type")).toBe("text");
      expect(el.getAttribute("placeholder")).toBe("Enter");
    });

    test("sets boolean attributes to true", () => {
      mount(<input id="bool-attr" disabled />);
      expect((document.getElementById("bool-attr") as HTMLInputElement).disabled).toBe(true);
    });

    test("renders reactive signals", () => {
      const count = signal(0);
      const className = signal("initial");

      mount(
        <div id="reactive" class={className}>
          {count}
        </div>,
      );
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

      mount(
        <div id="computed">
          {a} + {b} = {() => a() + b()}
        </div>,
      );
      const el = document.getElementById("computed")!;

      expect(el.textContent).toBe("1 + 2 = 3");

      a(10);
      b(20);
      flush();
      expect(el.textContent).toBe("10 + 20 = 30");
    });

    test("conditionals rendering", () => {
      const show = signal(true);

      mount(
        <div id="cond-container">
          <span id="toggle">{() => (show() ? <b>Yes</b> : <b>No</b>)}</span>
        </div>,
      );

      expect(document.querySelector("#toggle b")?.textContent).toBe("Yes");

      show(false);
      flush();
      expect(document.querySelector("#toggle b")?.textContent).toBe("No");
    });

    test("nullable values render as empty string", () => {
      const value = signal<string | null | undefined>("content");

      mount(
        <div>
          <span id="nullable">{value}</span>
        </div>,
      );

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
      mount(
        <div id="static-falsy">
          before{false}
          {null}
          {undefined}after
        </div>,
      );
      expect(document.getElementById("static-falsy")?.textContent).toBe("beforeafter");
    });

    test("signal with zero renders as '0'", () => {
      const zeroSig = signal(0);
      mount(<span id="zero">{zeroSig}</span>);
      expect(document.getElementById("zero")?.textContent).toBe("0");
    });

    test("static and reactive props", () => {
      const isDisabled = signal(true);

      mount(
        <button id="prop-test" type="submit" data-custom="value" disabled={() => !!isDisabled()}>
          Submit
        </button>,
      );

      const btn = document.getElementById("prop-test") as HTMLButtonElement;
      expect(btn.getAttribute("type")).toBe("submit");
      expect(btn.getAttribute("data-custom")).toBe("value");
      expect(btn.hasAttribute("disabled")).toBe(true);

      isDisabled(false);
      flush();
      expect(btn.hasAttribute("disabled")).toBe(false);
    });

    test("null attribute is not set", () => {
      mount(<input id="null-prop" readonly={null} />);
      expect(document.getElementById("null-prop")?.hasAttribute("readonly")).toBe(false);
    });

    test("fragments render", () => {
      mount(
        <div id="frag-container">
          <span>Static 1</span>
          <span>Static 2</span>
        </div>,
      );

      const container = document.getElementById("frag-container")!;
      expect(container.querySelectorAll("span").length).toBe(2);
    });

    test("dynamic fragments from signal items", () => {
      const items = signal(["a", "b"]);

      mount(<div id="frag-container">{() => items().map((i) => <em>{i}</em>)}</div>);

      const container = document.getElementById("frag-container")!;
      expect(container.querySelectorAll("em").length).toBe(2);

      items(["x", "y", "z"]);
      flush();
      expect(container.querySelectorAll("em").length).toBe(3);
      expect(container.querySelectorAll("em")[2]?.textContent).toBe("z");
    });

    test("throws for selector that does not match any element", () => {
      expect(() => mount(<div>test</div>, "#nonexistent")).toThrow(
        '[dom] mount: target "#nonexistent" not found in document',
      );
    });
  });
});
