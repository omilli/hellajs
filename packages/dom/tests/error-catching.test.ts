import { describe, test, expect, beforeEach, mock } from "bun:test";
import { mount, html, flushMount, onError } from "@hellajs/dom/bundle";
import type { HellaNode, ErrorContext } from "@hellajs/dom";
import { fallbackHandler } from "./helpers";

beforeEach(() => {
  resetTestState();
});

describe("dom", () => {
  describe("error catching", () => {
    test("handler throws is caught and logged", () => {
      const suppressed = suppressConsole();

      onError(() => { throw new Error('Handler error'); });

      const container = setupContainer();
      mount(html`
        <div error:fallback=${() => html`<span>E</span>`}>
          ${() => { throw new Error('Original'); }}
        </div>
      `, container);

      expect(suppressed.errors.some((e: unknown[]) => typeof e[0] === 'string' && e[0].includes('handler threw'))).toBe(true);
      suppressed.restore();
    });

    test("resolveErrorConfig returns undefined when no config exists", () => {
      let receivedConfig: unknown = 'set';
      onError((_, context) => {
        receivedConfig = context.config;
        return html`<span>E</span>` as HellaNode;
      });

      const container = setupContainer();
      mount(html`
        <div><span><button on:click=${() => { throw new Error('click') }}>X</button></span></div>
      `, container);

      container.querySelector('button')!.click();
      expect(receivedConfig).toBeUndefined();
    });

    test("beforeMount hook error is caught and handled", () => {
      fallbackHandler(html`<span>E</span>`);

      const container = setupContainer();
      mount(html`
        <div error:fallback=${() => html`<span>FB</span>`}>
          <span hook:beforeMount=${() => { throw new Error('hook') }}>Content</span>
        </div>
      `, container);

      expect(container.textContent).toContain('Content');
    });

    test("direct event handler is replaced when updated on same element", () => {
      const calls: string[] = [];
      onError(() => html`<span>E</span>` as HellaNode);

      const container = setupContainer();
      const h1 = () => calls.push('h1');
      const h2 = () => calls.push('h2');

      mount(html`<button id="btn" e:click=${h1}>X</button>`, container);
      (container.querySelector('#btn') as HTMLElement)!.click();
      expect(calls).toEqual(['h1']);

      mount(html`<button id="btn" e:click=${h2}>X</button>`, container);
      (container.querySelector('#btn') as HTMLElement)!.click();
      expect(calls).toEqual(['h1', 'h2']);
    });

    test("prevents infinite loop when handler re-triggers error on same boundary via direct event", () => {
      const suppressed = suppressConsole();

      onError((error: Error, context: ErrorContext) => {
        if (error.message === 'first') {
          const btn = context.element?.querySelector('button');
          btn?.dispatchEvent(new Event('click'));
        }
        return context.config?.fallback?.(error) ?? null;
      });

      const container = setupContainer();
      mount(html`
        <div error:fallback=${(e: Error) => html`<span>${e.message}</span>`}>
          <button e:click=${() => { throw new Error('second') }}>X</button>
          ${() => { throw new Error('first') }}
        </div>
      `, container);

      expect(suppressed.errors.some((e: unknown[]) =>
        typeof e[0] === 'string' && e[0].includes('infinite loop')
      )).toBe(true);
      suppressed.restore();
    });

    test("effect error in registry.addEffect is caught", () => {
      onError((error: Error) => html`<span>E: ${error.message}</span>` as HellaNode);

      const shouldThrow = signal(false);
      const container = setupContainer();
      mount(html`
        <div id="test">${() => { if (shouldThrow()) throw new Error('effect'); return 'OK' }}</div>
      `, container);

      expect(container.textContent).toBe('OK');

      shouldThrow(true);
      flushMount();

      expect(container.textContent).toBe('E: effect');
    });

    test("beforeUpdate hook error is caught and dispatched", () => {
      const errorMock = mock(() => null);
      onError(errorMock);

      const value = signal("a");
      const container = setupContainer();
      mount(html`
        <div id="test" hook:beforeUpdate=${() => { throw new Error('bu'); }} bind:data-value=${value}></div>
      `, container);

      flushMount(container);
      value("b");
      flush();

      expect(errorMock).toHaveBeenCalledTimes(1);
      const call = errorMock.mock.calls[0] as unknown[];
      expect((call[0] as Error).message).toBe('bu');
      expect((call[1] as ErrorContext).phase).toBe('update');
    });

    test("afterUpdate hook error is caught and dispatched", () => {
      const errorMock = mock(() => null);
      onError(errorMock);

      const value = signal("a");
      const container = setupContainer();
      mount(html`
        <div id="test" hook:afterUpdate=${() => { throw new Error('au'); }} bind:data-value=${value}></div>
      `, container);

      flushMount(container);
      value("b");
      flush();

      expect(errorMock).toHaveBeenCalledTimes(1);
      const call = errorMock.mock.calls[0] as unknown[];
      expect((call[0] as Error).message).toBe('au');
      expect((call[1] as ErrorContext).phase).toBe('update');
    });

    test("beforeUpdate hook error does not prevent subsequent updates", () => {
      onError(() => null);

      const value = signal("a");
      const container = setupContainer();
      mount(html`
        <div id="test" hook:beforeUpdate=${() => { throw new Error('hook'); }} bind:data-value=${value}></div>
      `, container);

      flushMount(container);

      value("b");
      flush();
      expect(document.getElementById("test")!.getAttribute("data-value")).toBe("b");

      value("c");
      flush();
      expect(document.getElementById("test")!.getAttribute("data-value")).toBe("c");
    });

    test("afterUpdate hook error does not prevent subsequent updates", () => {
      onError(() => null);

      const value = signal("a");
      const container = setupContainer();
      mount(html`
        <div id="test" hook:afterUpdate=${() => { throw new Error('hook'); }} bind:data-value=${value}></div>
      `, container);

      flushMount(container);

      value("b");
      flush();
      expect(document.getElementById("test")!.getAttribute("data-value")).toBe("b");

      value("c");
      flush();
      expect(document.getElementById("test")!.getAttribute("data-value")).toBe("c");
    });
  });
});