import { describe, test, expect, beforeEach } from "bun:test";
import { mount, html, flushMount, onError } from "@hellajs/dom/bundle";
import type { HellaNode } from "@hellajs/dom";
import { fallbackHandler } from "./helpers";

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
          ${() => { throw new Error('test'); }}
        </div>
      `, container);

      expect(resetFn).toBeDefined();
      expect(typeof resetFn).toBe('function');
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
          ${() => { if (shouldThrow()) throw new Error('oops'); return html`<span>OK</span>`; }}
        </div>
      `, container);

      expect(container.textContent).toBe('E: oops');

      shouldThrow(false);
      resetFn!();
      flushMount();

      expect(container.textContent).toBe('OK');
    });

    test("reset without boundary does nothing", () => {
      let resetFn: (() => void) | undefined;
      onError((_, context) => {
        resetFn = context.reset;
        return html`<span>Error</span>` as HellaNode;
      });

      const container = setupContainer();
      mount(html`<div>${() => { throw new Error('test'); }}</div>`, container);

      expect(resetFn).toBeUndefined();
    });

    test("reset can be called multiple times", () => {
      const shouldThrow = signal(true);
      let resetFn: (() => void) | undefined;
      let count = 0;

      onError((_, context) => {
        count++;
        resetFn = context.reset;
        return html`<span>Error #${count}</span>` as HellaNode;
      });

      const container = setupContainer();
      mount(html`
        <div error:fallback=${() => html`<span>F</span>`}>
          ${() => { if (shouldThrow()) throw new Error('oops'); return html`<span>OK</span>`; }}
        </div>
      `, container);

      expect(container.textContent).toBe('Error #1');

      resetFn!();
      flushMount();
      expect(container.textContent).toBe('Error #2');

      shouldThrow(false);
      resetFn!();
      flushMount();
      expect(container.textContent).toBe('OK');
    });

    test("same reset function restores content across multiple calls", () => {
      const shouldThrow = signal(true);
      let firstReset: (() => void) | undefined;
      let errorCount = 0;

      onError((_, context) => {
        errorCount++;
        if (!firstReset) firstReset = context.reset;
        return html`<span>Error #${errorCount}</span>` as HellaNode;
      });

      const container = setupContainer();
      mount(html`
        <div error:fallback=${() => html`<span>F</span>`}>
          ${() => { if (shouldThrow()) throw new Error('oops'); return html`<span>OK</span>`; }}
        </div>
      `, container);

      expect(container.textContent).toBe('Error #1');

      firstReset!();
      expect(container.textContent).toBe('Error #2');

      firstReset!();
      expect(container.textContent).toBe('Error #3');

      shouldThrow(false);
      firstReset!();
      expect(container.textContent).toBe('OK');
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
          ${() => { if (shouldThrow()) throw new Error('oops'); return html`<span>Original</span>`; }}
        </div>
      `, container);

      expect(container.textContent).toBe('Error');

      shouldThrow(false);
      resetFn!();
      expect(container.textContent).toBe('Original');

      shouldThrow(true);
      flushMount();
      expect(container.textContent).toBe('Error');

      shouldThrow(false);
      resetFn!();
      expect(container.textContent).toBe('Original');
    });

    test("error replaces boundary content for event errors", () => {
      fallbackHandler(html`<span>Default</span>`);

      const container = setupContainer();
      mount(html`
        <div id="b" error:fallback=${() => html`<span>FB</span>`}>
          <button id="btn" on:click=${() => { throw new Error('click'); }}>X</button>
          <span id="sib">Sibling</span>
        </div>
      `, container);

      expect((container.querySelector('#btn') as HTMLElement)).not.toBeNull();
      (container.querySelector('#btn') as HTMLElement)!.click();
      expect(container.querySelector('#b')?.children.length).toBe(1);
      expect(container.textContent).toBe('FB');
    });

    test("reactive child errors preserve siblings", () => {
      fallbackHandler(html`<span>Default</span>`);

      const s = signal(false);
      const container = setupContainer();
      mount(html`
        <div id="b2" error:fallback=${() => html`<span>FB</span>`}>
          <span>${() => { if (s()) throw new Error('up'); return 'OK'; }}</span>
          <span id="other">Other</span>
        </div>
      `, container);

      expect(container.querySelector('#other')).not.toBeNull();
      s(true);
      flushMount();
      expect(container.textContent).toContain('FB');
      expect(container.textContent).toContain('Other');
      expect(container.querySelector('#other')).not.toBeNull();
    });

    test("without boundary, fallback replaces error element content", () => {
    onError(() => html`<span>Global</span>` as HellaNode);

    const container = setupContainer();
    mount(html`
      <div id="parent">
        <div id="child">${() => { throw new Error('no boundary'); }}</div>
      </div>
    `, container);

    expect(container.querySelector('#child')?.textContent).toBe('Global');
    expect(container.querySelector('#parent')).not.toBeNull();
  });

  test("initial mount error with direct child shows fallback in boundary", () => {
    fallbackHandler(html`<span>Default</span>`);

    const container = setupContainer();
    mount(html`
      <div id="b" error:fallback=${() => html`<span>Mount FB</span>`}>
        ${() => { throw new Error('direct'); }}
      </div>
    `, container);

    expect(container.querySelector('#b')?.textContent).toContain('Mount FB');
  });

  test("bind error replaces boundary content when boundary exists", () => {
    fallbackHandler(html`<span>E</span>`);

    const shouldThrow = signal(false);
    const container = setupContainer();
    mount(html`
      <div id="b" error:fallback=${(e: Error) => html`<span>FB: ${e.message}</span>`}>
        <span id="c1">C1</span>
        <span id="c2" bind:test=${() => { if (shouldThrow()) throw new Error('bind'); return 'ok'; }}>C2</span>
        <span id="c3">C3</span>
      </div>
    `, container);

    expect(container.querySelector('#c1')).not.toBeNull();

    shouldThrow(true);
    flushMount();

    expect(container.textContent).toBe('FB: bind');
    expect(container.querySelector('#c1')).toBeNull();
    expect(container.querySelector('#c3')).toBeNull();
  });

  test("bind error replaces element content when no boundary", () => {
    const suppressed = suppressConsole();
    onError((error: Error) => html`<span>E: ${error.message}</span>` as HellaNode);

    const shouldThrow = signal(false);
    const container = setupContainer();
    mount(html`
      <div id="parent">
        <span id="child" bind:test=${() => { if (shouldThrow()) throw new Error('bind'); return 'ok'; }}>Content</span>
      </div>
    `, container);

    expect(container.querySelector('#child')?.textContent).toBe('Content');

    shouldThrow(true);
    flushMount();

    expect(container.querySelector('#child')?.textContent).toBe('E: bind');
    suppressed.restore();
  });

  test("direct event handler error without boundary replaces element", () => {
    const suppressed = suppressConsole();
    onError((error: Error) => html`<span>E: ${error.message}</span>` as HellaNode);

    const container = setupContainer();
    mount(html`
      <div id="parent">
        <button id="btn" e:click=${() => { throw new Error('no config'); }}>X</button>
      </div>
    `, container);

    expect((container.querySelector('#btn') as HTMLElement)).not.toBeNull();

    (container.querySelector('#btn') as HTMLElement)!.click();

    expect((container.querySelector('#btn') as HTMLElement)?.textContent).toBe('E: no config');
    suppressed.restore();
  });

  test("existing fallback behavior still works for reactive child errors", () => {
    fallbackHandler(html`<span>E</span>`);

    const shouldThrow = signal(false);
    const container = setupContainer();
    mount(html`
      <div id="b" error:fallback=${(e: Error) => html`<span>FB: ${e.message}</span>`}>
        <span id="c1">C1</span>
        <span id="c2">${() => { if (shouldThrow()) throw new Error('reactive'); return 'C2'; }}</span>
        <span id="c3">C3</span>
      </div>
    `, container);

    expect(container.querySelector('#c1')).not.toBeNull();

    shouldThrow(true);
    flushMount();

    expect(container.textContent).toContain('FB: reactive');
    expect(container.querySelector('#c1')).not.toBeNull();
    expect(container.querySelector('#c2')).not.toBeNull();
    expect(container.querySelector('#c2')?.textContent).toContain('FB: reactive');
    expect(container.querySelector('#c3')).not.toBeNull();
  });
  });
});