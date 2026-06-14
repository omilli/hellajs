import { describe, test, expect, beforeEach } from "bun:test";
import { mount, html, flushMount, onError, peekState } from "@hellajs/dom/bundle";
import type { HellaNode, ErrorContext } from "@hellajs/dom";

beforeEach(() => {
  resetTestState();
});

describe("dom", () => {
  describe("error boundary", () => {
    test("caches resolved boundary on error-origin element", () => {
      onError((error: Error, context: ErrorContext) => context.config?.fallback?.(error) ?? html`<span>E</span>` as HellaNode);

      const container = setupContainer();
      mount(html`
        <div id="b" error:fallback=${() => html`<span>F</span>`}>
          <div id="mid">
            <span id="deep">
              <button id="btn" on:click=${() => { throw new Error('click') }}>X</button>
            </span>
          </div>
        </div>
      `, container);

      const btn = (container.querySelector('#btn') as HTMLElement) as Element;
      btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      flushMount();

      expect(peekState(btn)?.cachedBoundary?.id).toBe('b');
    });

    test("uses cached boundary for repeated errors", () => {
      onError((error: Error, context: ErrorContext) => context.config?.fallback?.(error) ?? html`<span>E</span>` as HellaNode);

      const shouldThrow = signal(false);
      const container = setupContainer();
      mount(html`
        <div id="b" error:fallback=${() => html`<span>F</span>`}>
          <span id="deep">${() => { if (shouldThrow()) throw new Error('up'); return 'OK' }}</span>
        </div>
      `, container);

      const deep = container.querySelector('#deep') as Element;

      shouldThrow(true);
      flushMount();
      expect(peekState(deep)?.cachedBoundary?.id).toBe('b');

      shouldThrow(false);
      flushMount();
      shouldThrow(true);
      flushMount();

      expect(peekState(deep)?.cachedBoundary?.id).toBe('b');
    });

    test("error:boundary explicitly marks boundary", () => {
      onError((error: Error, context: ErrorContext) => context.config?.fallback?.(error) ?? html`<span>D</span>` as HellaNode);

      const container = setupContainer();
      mount(html`
        <div id="explicit" error:boundary error:fallback=${() => html`<span>FB</span>`}>
          <button on:click=${() => { throw new Error('click') }}>X</button>
        </div>
      `, container);

      container.querySelector('button')!.click();
      expect(container.textContent).toBe('FB');
    });

    test("element with only error:category is NOT a boundary", () => {
      onError(() => html`<span>Global</span>` as HellaNode);

      const container = setupContainer();
      mount(html`
        <div id="parent" error:category="sidebar">
          <span id="child"><button on:click=${() => { throw new Error('click') }}>X</button></span>
        </div>
      `, container);

      container.querySelector('button')!.click();
      expect(container.textContent).toBe('Global');
      expect(container.querySelector('#child')).not.toBeNull();
    });

    test("error:fallback implicitly creates boundary", () => {
      onError((error: Error, context: ErrorContext) => context.config?.fallback?.(error) ?? html`<span>D</span>` as HellaNode);

      const container = setupContainer();
      mount(html`
        <div id="implicit" error:fallback=${() => html`<span>FB</span>`}>
          <button on:click=${() => { throw new Error('click') }}>X</button>
        </div>
      `, container);

      container.querySelector('button')!.click();
      expect(container.textContent).toBe('FB');
    });

    test("nested boundaries with explicit designation", () => {
      let outerCalled = false;
      onError((_, context) => {
        if (context.config?.category === 'inner') return html`<span>Inner</span>` as HellaNode;
        outerCalled = true;
        return html`<span>Outer</span>` as HellaNode;
      });

      const container = setupContainer();
      mount(html`
        <div error:boundary error:category="outer" error:fallback=${() => html`<span>O</span>`}>
          <div error:boundary error:category="inner" error:fallback=${() => html`<span>I</span>`}>
            <button on:click=${() => { throw new Error('click') }}>X</button>
          </div>
        </div>
      `, container);

      container.querySelector('button')!.click();
      expect(outerCalled).toBe(false);
      expect(container.textContent).toBe('Inner');
    });

    test("error:boundary without error:fallback still acts as boundary", () => {
      onError(() => html`<span>Handler FB</span>` as HellaNode);

      const container = setupContainer();
      mount(html`
        <div error:boundary>
          <button on:click=${() => { throw new Error('click') }}>X</button>
        </div>
      `, container);

      container.querySelector('button')!.click();
      expect(container.textContent).toBe('Handler FB');
    });

    test("cache invalidation when boundary config is removed", () => {
      const suppressed = suppressConsole();

      onError((error: Error, context: ErrorContext) => context.config?.fallback?.(error) ?? html`<span>E</span>` as HellaNode);

      const shouldThrow = signal(false);
      const container = setupContainer();
      mount(html`
        <div id="b" error:fallback=${() => html`<span>F</span>`}>
          <span id="deep">${() => { if (shouldThrow()) throw new Error('up'); return 'OK' }}</span>
        </div>
      `, container);

      const deep = container.querySelector('#deep') as Element;

      shouldThrow(true);
      flushMount();
      expect(peekState(deep)?.cachedBoundary).toBeDefined();

      const boundary = container.querySelector('#b') as HTMLElement;
      peekState(boundary)!.errorConfig = undefined;

      shouldThrow(false);
      flushMount();
      shouldThrow(true);
      flushMount();

      suppressed.restore();
    });

    test("direct event handler error is caught with boundary", () => {
      onError((error: Error, context: ErrorContext) => context.config?.fallback?.(error) ?? html`<span>E</span>` as HellaNode);

      const container = setupContainer();
      mount(html`
        <div id="b" error:fallback=${(e: Error) => html`<span>FB: ${e.message}</span>`}>
          <button id="btn" e:click=${() => { throw new Error('direct') }}>X</button>
          <span id="sib">Sibling</span>
        </div>
      `, container);

      expect((container.querySelector('#btn') as HTMLElement)).not.toBeNull();

      (container.querySelector('#btn') as HTMLElement)!.click();

      expect(container.textContent).toBe('FB: direct');
      expect((container.querySelector('#btn') as HTMLElement)).toBeNull();
      expect(container.querySelector('#sib')).toBeNull();
    });

    test("preserves sibling elements when reactive child errors", () => {
      onError((error: Error, context: ErrorContext) => context.config?.fallback?.(error) ?? html`<span>E</span>` as HellaNode);

      const shouldThrow = signal(false);
      const container = setupContainer();
      mount(html`
        <div id="b" error:fallback=${(e: Error) => html`<span>FB: ${e.message}</span>`}>
          <span id="sib1">${() => { if (shouldThrow()) throw new Error('oops1'); return 'OK1'; }}</span>
          <span id="sib2">${() => { return 'OK2'; }}</span>
        </div>
      `, container);

      expect(container.textContent).toBe('OK1OK2');

      shouldThrow(true);
      flushMount();

      expect(container.textContent).toContain('FB: oops1');
      expect(container.textContent).toContain('OK2');
      expect(container.querySelector('#sib1')).not.toBeNull();
      expect(container.querySelector('#sib1')?.textContent).toContain('FB: oops1');
      expect(container.querySelector('#sib2')).not.toBeNull();
      expect(container.querySelector('#sib2')?.textContent).toBe('OK2');
    });

    test("preserves static text when reactive child errors", () => {
      onError((error: Error, context: ErrorContext) => context.config?.fallback?.(error) ?? html`<span>E</span>` as HellaNode);

      const shouldThrow = signal(false);
      const container = setupContainer();
      mount(html`
        <div id="b" error:fallback=${(e: Error) => html`<span>FB: ${e.message}</span>`}>
          <span>Static Before</span>
          <span id="dynamic">${() => { if (shouldThrow()) throw new Error('static'); return 'Dynamic'; }}</span>
          <span>Static After</span>
        </div>
      `, container);

      expect(container.textContent).toBe('Static BeforeDynamicStatic After');

      shouldThrow(true);
      flushMount();

      expect(container.textContent).toContain('Static Before');
      expect(container.textContent).toContain('Static After');
      expect(container.textContent).toContain('FB: static');
      expect(container.querySelector('#dynamic')).not.toBeNull();
      expect(container.querySelector('#dynamic')?.textContent).toContain('FB: static');
    });

    test("nested boundaries preserve outer boundary content", () => {
      onError((error: Error, context: ErrorContext) => context.config?.fallback?.(error) ?? html`<span>Global</span>` as HellaNode);

      const shouldThrowInner = signal(false);
      const container = setupContainer();
      mount(html`
        <div id="outer" error:fallback=${(e: Error) => html`<span>Outer FB: ${e.message}</span>`}>
          <span id="outer-static">Outer Static</span>
          <div id="inner" error:fallback=${(e: Error) => html`<span>Inner FB: ${e.message}</span>`}>
            <span id="inner-dynamic">${() => { if (shouldThrowInner()) throw new Error('inner'); return 'Inner Dynamic'; }}</span>
          </div>
        </div>
      `, container);

      expect(container.textContent).toBe('Outer StaticInner Dynamic');

      shouldThrowInner(true);
      flushMount();

      expect(container.textContent).toContain('Outer Static');
      expect(container.textContent).toContain('Inner FB: inner');
      expect(container.querySelector('#outer-static')).not.toBeNull();
      expect(container.querySelector('#inner-dynamic')).not.toBeNull();
      expect(container.querySelector('#inner-dynamic')?.textContent).toContain('Inner FB: inner');
    });
  });
});