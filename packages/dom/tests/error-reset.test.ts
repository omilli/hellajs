import { describe, test, expect, beforeEach, mock } from "bun:test";
import { mount, html, flushMount, onError } from "@hellajs/dom/bundle";
import type { HellaNode } from "@hellajs/dom";

beforeEach(() => {
  resetTestState();
});

describe("dom", () => {
  describe("error reset", () => {
    test("context includes reset function when boundary exists", () => {
      let resetFn: (() => void) | undefined;
      onError((_, context) => {
        resetFn = context.reset;
        return html`<span>Error</span>` as HellaNode;
      });

      const container = setupContainer();
      mount(html`
        <div error:fallback=${() => html`<span>F</span>`}>
          ${() => { throw new Error("test"); }}
        </div>
      `, container);

      expect(resetFn).toBeDefined();
      expect(typeof resetFn).toBe("function");
    });

    test("reset re-renders original content", () => {
      const shouldThrow = signal(true);
      let resetFn: (() => void) | undefined;

      onError((_, context) => {
        resetFn = context.reset;
        return context.config?.fallback?.(_) ?? html`<span>F</span>` as HellaNode;
      });

      const container = setupContainer();
      mount(html`
        <div error:fallback=${(e: Error) => html`<span>E: ${e.message}</span>`}>
          ${() => { if (shouldThrow()) throw new Error("oops"); return html`<span>OK</span>`; }}
        </div>
      `, container);

      expect(container.textContent).toBe("E: oops");

      shouldThrow(false);
      resetFn!();
      flushMount();

      expect(container.textContent).toBe("OK");
    });

    test("reset without boundary does nothing", () => {
      let resetFn: (() => void) | undefined;
      onError((_, context) => {
        resetFn = context.reset;
        return html`<span>Error</span>` as HellaNode;
      });

      const container = setupContainer();
      mount(html`<div>${() => { throw new Error("test"); }}</div>`, container);

      expect(resetFn).toBeUndefined();
    });

    test("reset can be called multiple times", () => {
      const shouldThrow = signal(true);
      let resetFn: (() => void) | undefined;

      const errorHandler = mock((_error: Error, context: { reset?: () => void }) => {
        if (!resetFn) resetFn = context.reset;
        return html`<span>Error #${errorHandler.mock.calls.length}</span>` as HellaNode;
      });
      onError(errorHandler);

      const container = setupContainer();
      mount(html`
        <div error:fallback=${() => html`<span>F</span>`}>
          ${() => { if (shouldThrow()) throw new Error("oops"); return html`<span>OK</span>`; }}
        </div>
      `, container);

      expect(container.textContent).toBe("Error #1");

      resetFn!();
      flushMount();
      expect(container.textContent).toBe("Error #2");

      shouldThrow(false);
      resetFn!();
      flushMount();
      expect(container.textContent).toBe("OK");
    });

    test("same reset function restores content across multiple calls", () => {
      const shouldThrow = signal(true);
      let firstReset: (() => void) | undefined;

      const errorHandler = mock((_error: Error, context: { reset?: () => void }) => {
        if (!firstReset) firstReset = context.reset;
        return html`<span>Error #${errorHandler.mock.calls.length}</span>` as HellaNode;
      });
      onError(errorHandler);

      const container = setupContainer();
      mount(html`
        <div error:fallback=${() => html`<span>F</span>`}>
          ${() => { if (shouldThrow()) throw new Error("oops"); return html`<span>OK</span>`; }}
        </div>
      `, container);

      expect(container.textContent).toBe("Error #1");

      firstReset!();
      expect(container.textContent).toBe("Error #2");

      firstReset!();
      expect(container.textContent).toBe("Error #3");

      shouldThrow(false);
      firstReset!();
      expect(container.textContent).toBe("OK");
    });

    test("reset preserves original template across error cycles", () => {
      const shouldThrow = signal(true);
      let resetFn: (() => void) | undefined;

      onError((_, context) => {
        resetFn = context.reset;
        return html`<span>Error</span>` as HellaNode;
      });

      const container = setupContainer();
      mount(html`
        <div error:fallback=${() => html`<span>F</span>`}>
          ${() => { if (shouldThrow()) throw new Error("oops"); return html`<span>Original</span>`; }}
        </div>
      `, container);

      expect(container.textContent).toBe("Error");

      shouldThrow(false);
      resetFn!();
      expect(container.textContent).toBe("Original");

      shouldThrow(true);
      flushMount();
      expect(container.textContent).toBe("Error");

      shouldThrow(false);
      resetFn!();
      expect(container.textContent).toBe("Original");
    });
  });
});