import { describe, test, expect, beforeEach, mock } from "bun:test";
import { resetTestState, setupContainer } from "@utils/test-helpers.js";
import { mount, hydrate, html } from "@hellajs/dom/bundle";
import type { HellaNode } from "@hellajs/dom";
import { fallbackHandler } from "./helpers";

beforeEach(() => {
  resetTestState();
});

describe("dom", () => {
  describe("prefixed props routing", () => {
    test("props on:click handler fires on delegated click after mount", () => {
      const handler = mock(() => {});
      const node = { tag: "button", props: { "on:click": handler } };

      mount(node as unknown as HellaNode, "#app");

      const btn = document.querySelector("#app button")!;
      btn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      expect(handler).toHaveBeenCalledTimes(1);
    });

    test("props e:click attaches a direct listener", () => {
      const handler = mock(() => {});
      const node = { tag: "button", props: { "e:click": handler } };

      mount(node as unknown as HellaNode, "#app");

      const btn = document.querySelector("#app button")!;
      // Direct listeners fire on non-bubbling events; delegated ones do not
      btn.dispatchEvent(new MouseEvent("click", { bubbles: false }));
      expect(handler).toHaveBeenCalledTimes(1);
    });

    test("props hook:afterMount fires the lifecycle hook", () => {
      let mounted: Element | undefined;
      const node = {
        tag: "button",
        props: { "hook:afterMount": (el: Element) => { mounted = el; } }
      };

      mount(node as unknown as HellaNode, "#app");

      expect(mounted).toBe(document.querySelector("#app button")!);
    });

    test("props error:fallback wires the boundary config", () => {
      fallbackHandler(html`<span>Handler</span>`);
      const node = {
        tag: "div",
        props: { "error:fallback": (e: Error) => html`<span>Custom: ${e.message}</span>` },
        children: [() => { throw new Error("oops"); }]
      };

      const container = setupContainer();
      mount(node as unknown as HellaNode, container);

      expect(container.textContent).toBe("Custom: oops");
    });

    test("the same hand-built node hydrates with the handler live", () => {
      const handler = mock(() => {});
      const node = { tag: "button", props: { "on:click": handler } };
      const container = setupContainer();
      container.innerHTML = "<button></button>";

      hydrate(node as unknown as HellaNode, container);

      const btn = container.querySelector("button")!;
      btn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      expect(handler).toHaveBeenCalledTimes(1);
    });

    test("props xlink:href still renders as a literal attribute", () => {
      const node = { tag: "button", props: { "xlink:href": "#a", "xml:lang": "en" } };

      mount(node as unknown as HellaNode, "#app");

      const btn = document.querySelector("#app button")!;
      expect(btn.getAttribute("xlink:href")).toBe("#a");
      expect(btn.getAttribute("xml:lang")).toBe("en");
    });

    test("a routed handler produces no literal on:click attribute", () => {
      const handler = () => {};
      const node = { tag: "button", props: { "on:click": handler } };

      mount(node as unknown as HellaNode, "#app");

      const btn = document.querySelector("#app button")!;
      expect(btn.outerHTML).not.toContain("on:click");
    });

    test("runtime html delivers props['on:click'] to the component", () => {
      let received: unknown;
      const Comp = (props: Record<string, unknown>) => {
        received = props["on:click"];
        return html`<span>ok</span>`;
      };
      const handler = () => {};

      mount(html`<${Comp} on:click=${handler} />`, "#app");

      expect(received).toBe(handler);
    });
  });
});
