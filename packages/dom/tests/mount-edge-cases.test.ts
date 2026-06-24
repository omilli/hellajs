import { describe, test, expect, beforeEach, mock } from "bun:test";
import { mount, html, onError, peekState } from "@hellajs/dom/bundle";
import type { HellaNode } from "@hellajs/dom";

beforeEach(() => {
  resetTestState();
});

describe("dom", () => {
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
});
