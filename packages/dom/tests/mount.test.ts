import { describe, test, expect, beforeEach, mock } from "bun:test";
import { mount, html, peekState } from "@hellajs/dom/bundle";
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

      mount(html`<div id="reactive" bind:class=${className}>${count}</div>`);
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
          bind:disabled=${() => isDisabled() ? "disabled" : false}
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
  });

  describe("mount targets", () => {
    test("mounts to selector or element", () => {
      mount(html`<div id="default">Default</div>`);
      expect(document.getElementById("default")).not.toBeNull();

      resetTestState();
      resetTestState('<div id="custom"></div>');
      mount(html`<span>Custom</span>`, "#custom");
      expect(document.querySelector("#custom span")).not.toBeNull();

      const container = document.createElement("div");
      document.body.appendChild(container);
      mount(html`<b>Direct</b>`, container);
      expect(container.querySelector("b")?.textContent).toBe("Direct");
    });
  });

  describe("mount edge cases", () => {
    test("resolveNode with raw Node instance appends directly", () => {
      const rawSpan = document.createElement("span");
      rawSpan.id = "raw-node";
      rawSpan.textContent = "raw";

      mount(html`<div id="raw-parent">${rawSpan}</div>`);
      expect(document.querySelector("#raw-parent #raw-node")?.textContent).toBe("raw");
    });

    test("component scope transfers to mounted DOM element", () => {
      const disposed = mock(() => { });
      const Comp = () => {
        scope(() => { });
        const node = html`<div id="scoped-comp">Comp</div>` as HellaNode;
        node.__scope = disposed;
        return node;
      };

      mount(html`<div><${Comp} /></div>`);

      const el = document.getElementById("scoped-comp")!;
      expect(typeof peekState(el)?.componentScope).toBe("function");
    });

    test("error config transfers to element during mount", () => {
      onError((err, ctx) => ctx.config?.fallback?.(err) ?? null);

      const fallback = (_err: Error) => html`<span id="fallback">${_err.message}</span>` as HellaNode;
      mount(html`
        <div id="boundary" error:boundary error:fallback=${fallback}>
          ${() => { throw new Error("mount error"); }}
        </div>
      `);

      expect(document.getElementById("fallback")).not.toBeNull();
      onError(null);
    });
  });

  describe("mount validation", () => {
    test("throws for selector that does not match any element", () => {
      expect(() => mount(html`<div>test</div>`, "#nonexistent")).toThrow('[dom] mount: target "#nonexistent" not found in document');
    });
  });

  describe("async mount", () => {
    test("renders content from async component function", async () => {
      mount(async () => html`<div id="async-loaded">loaded</div>` as HellaNode);
      expect(document.getElementById("async-loaded")).toBeNull();
      await tick(0);
      expect(document.getElementById("async-loaded")?.textContent).toBe("loaded");
    });

    test("sync mount behavior is unchanged", () => {
      mount(html`<div id="sync-mount">sync</div>`);
      expect(document.getElementById("sync-mount")?.textContent).toBe("sync");
    });

    test("routes rejection through dispatchError when no onError handler", async () => {
      const suppressed = suppressConsole();
      mount(async () => { throw new Error("async mount fail"); });
      await tick(0);
      expect(suppressed.errors.length).toBe(1);
      expect(suppressed.errors[0]?.[1]).toBeInstanceOf(Error);
      expect((suppressed.errors[0]?.[1] as Error).message).toBe("async mount fail");
      suppressed.restore();
    });

    test("routes rejection through onError handler when registered", async () => {
      const handler = mock(() => null);
      onError(handler);
      mount(async () => { throw new Error("handler test"); });
      await tick(0);
      expect(handler).toHaveBeenCalledTimes(1);
      expect((handler.mock.calls[0] as unknown[])?.[0]).toBeInstanceOf(Error);
      onError(null);
    });
  });

  describe("mount binding", () => {
    test("value set via direct property with falsy fallback", () => {
      const inputValue = signal("hello");

      mount(html`
        <div>
          <input id="val-input" bind:value=${inputValue} />
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
  });

  describe("reactive dynamic children", () => {
    test("proxy forwards non-appendChild property access for custom dynamic components", () => {
      const toggle = signal<(() => void) | null>(null);
      const accessedNodeType = mock(() => {});

      const CustomDynamic = ((parent: Element) => {
        const nodeType = (parent as unknown as { nodeType: number }).nodeType;
        if (nodeType !== undefined) accessedNodeType();
        parent.appendChild(document.createTextNode("dynamic"));
      }) as (() => void) & { isDynamic: boolean };
      CustomDynamic.isDynamic = true;

      mount(html`
        <div id="host">
          ${() => toggle()}
        </div>
      `);

      expect(document.getElementById("host")?.textContent).toBe("");

      toggle(CustomDynamic);
      flush();

      expect(document.getElementById("host")?.textContent).toContain("dynamic");
      expect(accessedNodeType).toHaveBeenCalledTimes(1);
    });
  });
});