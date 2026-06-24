import { describe, test, expect, beforeEach, mock } from "bun:test";
import { mount, html, flushMount, onError } from "@hellajs/dom/bundle";
import type { HellaNode, ErrorContext } from "@hellajs/dom";
import { fallbackHandler } from "./helpers";

beforeEach(() => {
  resetTestState();
});

describe("dom", () => {
  describe("error", () => {
    test("uses element fallback when config present", () => {
      fallbackHandler(html`<span>Default</span>`);

      const container = setupContainer();
      mount(html`
        <div error:fallback=${(e: Error) => html`<span>Custom: ${e.message}</span>`}>
          ${() => { throw new Error("oops"); }}
        </div>
      `, container);

      expect(container.textContent).toBe("Custom: oops");
    });

    test("falls back to handler default when no element config", () => {
      onError((error: Error) => html`<span>Default: ${error.message}</span>` as HellaNode);

      const container = setupContainer();
      mount(html`<div>${() => { throw new Error("oops"); }}</div>`, container);

      expect(container.textContent).toBe("Default: oops");
    });

    test("render phase has no config (no element)", () => {
      let receivedConfig: unknown = "set";
      onError((_, context) => {
        receivedConfig = context.config;
        return null;
      });

      mount(html`<${() => { throw new Error("render"); }} />`);

      expect(receivedConfig).toBeUndefined();
    });

    test("config does not merge from parents", () => {
      fallbackHandler(html`<span>Parent</span>`);

      const container = setupContainer();
      mount(html`
        <div error:fallback=${() => html`<span>Parent</span>`} error:category="outer">
          <div error:fallback=${() => html`<span>Child</span>`}>
            ${() => { throw new Error("oops"); }}
          </div>
        </div>
      `, container);

      expect(container.textContent).toBe("Child");
    });

    test("category is passed to handler", () => {
      let receivedCategory: string | undefined;
      onError((_, context) => {
        receivedCategory = context.config?.category;
        return null;
      });

      const container = setupContainer();
      mount(html`
        <div error:category="sidebar">
          <button on:click=${() => { throw new Error("click"); }}>Click</button>
        </div>
      `, container);

      container.querySelector("button")?.click();
      expect(receivedCategory).toBe("sidebar");
    });

    test("catches errors in shallow reactive child", () => {
      fallbackHandler();

      const container = setupContainer();
      mount(html`
        <div error:fallback=${() => html`<span>Caught</span>`}>
          ${() => { throw new Error("shallow"); }}
        </div>
      `, container);
      expect(container.textContent).toBe("Caught");
    });

    test("catches errors in deeply nested reactive child", () => {
      fallbackHandler();

      const container = setupContainer();
      mount(html`
        <div error:fallback=${() => html`<span>Caught</span>`}>
          <div><span>${() => { throw new Error("deep"); }}</span></div>
        </div>
      `, container);
      expect(container.textContent).toBe("Caught");
    });

    test("catches error in event handler", () => {
      fallbackHandler();

      const container = setupContainer();
      mount(html`
        <div error:fallback=${() => html`<span>Event error</span>`}>
          <button on:click=${() => { throw new Error("Click error"); }}>Click</button>
        </div>
      `, container);

      container.querySelector("button")!.click();
      expect(container.textContent).toBe("Event error");
    });

    test("nearest element config wins", () => {
      const outerCalled = mock(() => { });
      onError((_, context) => {
        if (context.config?.category === "inner") return html`<span>Inner</span>` as HellaNode;
        outerCalled();
        return html`<span>Outer</span>` as HellaNode;
      });

      const container = setupContainer();
      mount(html`
        <div error:category="outer" error:fallback=${() => html`<span>Outer</span>`}>
          <div error:category="inner" error:fallback=${() => html`<span>Inner</span>`}>
            ${() => { throw new Error("Nested"); }}
          </div>
        </div>
      `, container);

      expect(outerCalled).not.toHaveBeenCalled();
      expect(container.textContent).toBe("Inner");
    });

    test("handler returning null logs error without UI change", () => {
      const suppressed = suppressConsole();
      const called = mock(() => { });
      onError(() => {
        called();
        return null;
      });

      const container = setupContainer();
      mount(html`<div id="content">${() => { throw new Error("Logged"); }}</div>`, container);

      expect(called).toHaveBeenCalledTimes(1);
      suppressed.restore();
    });

    test("works with html template error: prefix", () => {
      let capturedError: Error | null = null;
      onError((e) => {
        capturedError = e;
        return null;
      });

      const node = html`<div error:fallback=${(e: Error) => html`<span>${e.message}</span>`}>${() => { throw new Error("tpl"); }}</div>` as HellaNode;

      expect(node.error?.fallback).toBeDefined();
      mount(node);
      expect(capturedError!.message).toBe("tpl");
    });

    test("prevents infinite loop during mount error", () => {
      const suppressed = suppressConsole();
      const calls = mock(() => { });

      onError((error: Error, context: ErrorContext) => {
        calls();
        return context.config?.fallback?.(error) ?? null;
      });

      const container = setupContainer();
      mount(html`<div error:fallback=${() => { throw new Error("fb"); }}>${() => { throw new Error("orig"); }}</div>`, container);

      expect(calls).toHaveBeenCalledTimes(1);
      suppressed.restore();
    });

    test("prevents infinite loop during event error", () => {
      const suppressed = suppressConsole();
      const calls = mock(() => { });

      onError((error: Error, context: ErrorContext) => {
        calls();
        return context.config?.fallback?.(error) ?? null;
      });

      const container = setupContainer();
      mount(html`<div error:fallback=${() => { throw new Error("fb"); }}><button on:click=${() => { throw new Error("orig"); }}>X</button></div>`, container);

      const btn = container.querySelector("button");
      if (btn) btn.click();

      expect(calls).toHaveBeenCalledTimes(1);
      suppressed.restore();
    });

    test("prevents infinite loop during update error", () => {
      const suppressed = suppressConsole();
      const calls = mock(() => { });
      const s = signal(false);

      onError((error: Error, context: ErrorContext) => {
        calls();
        return context.config?.fallback?.(error) ?? null;
      });

      const container = setupContainer();
      mount(html`<div error:fallback=${() => { throw new Error("fb"); }}>${() => { if (s()) throw new Error("orig"); return "ok"; }}</div>`, container);

      s(true);
      flushMount();

      expect(calls).toHaveBeenCalledTimes(1);
      suppressed.restore();
    });

    test("supports multiple handlers, first non-null wins", () => {
      const order: string[] = [];

      onError(() => {
        order.push("first");
        return null;
      });
      onError(() => {
        order.push("second");
        return html`<span>Second</span>` as HellaNode;
      });
      onError(() => {
        order.push("third");
        return html`<span>Third</span>` as HellaNode;
      });

      const container = setupContainer();
      mount(html`<div>${() => { throw new Error("test"); }}</div>`, container);

      expect(order).toEqual(["first", "second"]);
      expect(container.textContent).toBe("Second");
    });

    test("remove function unregisters handler", () => {
      const firstCalled = mock(() => html`<span>First</span>` as HellaNode);
      const remove = onError(firstCalled);

      remove();
      onError(() => html`<span>Second</span>` as HellaNode);

      const container = setupContainer();
      mount(html`<div>${() => { throw new Error("test"); }}</div>`, container);

      expect(firstCalled).not.toHaveBeenCalled();
      expect(container.textContent).toBe("Second");
    });

    test("onError(null) clears all handlers", () => {
      const suppressed = suppressConsole();

      onError(() => html`<span>H1</span>` as HellaNode);
      onError(() => html`<span>H2</span>` as HellaNode);
      onError(null);

      const container = setupContainer();
      mount(html`<div>${() => { throw new Error("test"); }}</div>`, container);

      expect(suppressed.errors.length).toBeGreaterThan(0);
      expect(suppressed.errors[0]![0]).toContain("[dom]");
      suppressed.restore();
    });

    test("without boundary, fallback replaces error element content", () => {
      onError(() => html`<span>Global</span>` as HellaNode);

      const container = setupContainer();
      mount(html`
        <div id="parent">
          <div id="child">${() => { throw new Error("no boundary"); }}</div>
        </div>
      `, container);

      expect(container.querySelector("#child")?.textContent).toBe("Global");
      expect(container.querySelector("#parent")).not.toBeNull();
    });

    test("bind error replaces element content when no boundary", () => {
      const suppressed = suppressConsole();
      onError((error: Error) => html`<span>E: ${error.message}</span>` as HellaNode);

      const shouldThrow = signal(false);
      const container = setupContainer();
      mount(html`
        <div id="parent">
          <span id="child" bind:test=${() => { if (shouldThrow()) throw new Error("bind"); return "ok"; }}>Content</span>
        </div>
      `, container);

      expect(container.querySelector("#child")?.textContent).toBe("Content");

      shouldThrow(true);
      flushMount();

      expect(container.querySelector("#child")?.textContent).toBe("E: bind");
      suppressed.restore();
    });

    test("useful for library integration (tracking + UI)", () => {
      const tracked: Error[] = [];

      const remove = onError((error: Error) => {
        tracked.push(error);
        return null;
      });
      onError((error: Error) => html`<span>Error: ${error.message}</span>` as HellaNode);

      const container = setupContainer();
      mount(html`<div>${() => { throw new Error("tracked"); }}</div>`, container);

      expect(tracked.length).toBe(1);
      expect(tracked[0]!.message).toBe("tracked");
      expect(container.textContent).toBe("Error: tracked");

      remove();
    });
  });
});