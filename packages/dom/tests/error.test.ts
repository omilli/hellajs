import { describe, test, expect, afterEach, beforeEach } from "bun:test";
import { mount, html, flushMount, onError, clearErrorHandlers } from "@hellajs/dom/bundle";
import type { HellaNode } from "@hellajs/dom";

// Helper to suppress console output during error tests
function suppressConsole() {
  const errors: unknown[][] = [];
  const warns: unknown[][] = [];
  const origError = console.error;
  const origWarn = console.warn;
  console.error = (...args: unknown[]) => errors.push(args);
  console.warn = (...args: unknown[]) => warns.push(args);
  return {
    errors,
    warns,
    restore: () => {
      console.error = origError;
      console.warn = origWarn;
    }
  };
}

// Helper to create container and mount
function setupContainer() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  return container;
}

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
});

describe("error handler", () => {
  afterEach(() => {
    onError(null as any);
    document.body.innerHTML = '<div id="app"></div>';
  });

  test("uses element fallback when config present", () => {
    onError((error, context) => context.config?.fallback?.(error) ?? html`<span>Default</span>` as HellaNode);

    const container = setupContainer();
    mount(html`
      <div error:fallback=${(e: Error) => html`<span>Custom: ${e.message}</span>`}>
        ${() => { throw new Error('oops'); }}
      </div>
    `, container);

    expect(container.textContent).toBe('Custom: oops');
  });

  test("falls back to handler default when no element config", () => {
    onError((error) => html`<span>Default: ${error.message}</span>` as HellaNode);

    const container = setupContainer();
    mount(html`<div>${() => { throw new Error('oops'); }}</div>`, container);

    expect(container.textContent).toBe('Default: oops');
  });

  test("render phase has no config (no element)", () => {
    let receivedConfig: unknown = 'set';
    onError((_, context) => {
      receivedConfig = context.config;
      return null;
    });

    mount(html`<${() => { throw new Error('render'); }} />`);

    expect(receivedConfig).toBeUndefined();
  });

  test("config does not merge from parents", () => {
    onError((error, context) => context.config?.fallback?.(error) ?? html`<span>Parent</span>` as HellaNode);

    const container = setupContainer();
    mount(html`
      <div error:fallback=${() => html`<span>Parent</span>`} error:category="outer">
        <div error:fallback=${() => html`<span>Child</span>`}>
          ${() => { throw new Error('oops'); }}
        </div>
      </div>
    `, container);

    expect(container.textContent).toBe('Child');
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
        <button on:click=${() => { throw new Error('click'); }}>Click</button>
      </div>
    `, container);

    container.querySelector('button')?.click();
    expect(receivedCategory).toBe('sidebar');
  });

  test("catches errors in reactive child (shallow and deep)", () => {
    onError((error, context) => context.config?.fallback?.(error) ?? null);

    // Shallow
    const c1 = setupContainer();
    mount(html`
      <div error:fallback=${() => html`<span>Caught</span>`}>
        ${() => { throw new Error('shallow'); }}
      </div>
    `, c1);
    expect(c1.textContent).toBe('Caught');

    // Deep
    const c2 = setupContainer();
    mount(html`
      <div error:fallback=${() => html`<span>Caught</span>`}>
        <div><span>${() => { throw new Error('deep'); }}</span></div>
      </div>
    `, c2);
    expect(c2.textContent).toBe('Caught');
  });

  test("catches error in event handler", () => {
    onError((error, context) => context.config?.fallback?.(error) ?? null);

    const container = setupContainer();
    mount(html`
      <div error:fallback=${() => html`<span>Event error</span>`}>
        <button on:click=${() => { throw new Error('Click error'); }}>Click</button>
      </div>
    `, container);

    container.querySelector('button')!.click();
    expect(container.textContent).toBe('Event error');
  });

  test("nearest element config wins", () => {
    let outerCalled = false;
    onError((_, context) => {
      if (context.config?.category === 'inner') return html`<span>Inner</span>` as HellaNode;
      outerCalled = true;
      return html`<span>Outer</span>` as HellaNode;
    });

    const container = setupContainer();
    mount(html`
      <div error:category="outer" error:fallback=${() => html`<span>Outer</span>`}>
        <div error:category="inner" error:fallback=${() => html`<span>Inner</span>`}>
          ${() => { throw new Error('Nested'); }}
        </div>
      </div>
    `, container);

    expect(outerCalled).toBe(false);
    expect(container.textContent).toBe('Inner');
  });

  test("handler returning null logs error without UI change", () => {
    const suppressed = suppressConsole();
    let called = false;
    onError(() => {
      called = true;
      return null;
    });

    const container = setupContainer();
    mount(html`<div id="content">${() => { throw new Error('Logged'); }}</div>`, container);

    expect(called).toBe(true);
    suppressed.restore();
  });

  test("works with html template error: prefix", () => {
    let error: Error | null = null;
    onError((e) => {
      error = e;
      return null;
    });

    const node = html`<div error:fallback=${(e: Error) => html`<span>${e.message}</span>`}>${() => { throw new Error('tpl'); }}</div>` as HellaNode;

    expect(node.error?.fallback).toBeDefined();
    mount(node);
    expect(error!.message).toBe('tpl');
  });
});

describe("infinite loop prevention", () => {
  afterEach(() => {
    onError(null as any);
    document.body.innerHTML = '<div id="app"></div>';
  });

  test.each([
    ['mount', () => html`<div error:fallback=${() => { throw new Error('fb'); }}>${() => { throw new Error('orig'); }}</div>`],
    ['event', () => html`<div error:fallback=${() => { throw new Error('fb'); }}><button on:click=${() => { throw new Error('orig'); }}>X</button></div>`],
    ['update', () => {
      const s = signal(false);
      return html`<div error:fallback=${() => { throw new Error('fb'); }}>${() => { if (s()) throw new Error('orig'); return 'ok'; }}</div>`;
    }]
  ])("prevents infinite loop during %s", (_, getTemplate) => {
    const suppressed = suppressConsole();
    let calls = 0;

    onError((error, context) => {
      calls++;
      return context.config?.fallback?.(error) ?? null;
    });

    const container = setupContainer();
    const template = getTemplate();
    mount(template, container);

    // Trigger event phase
    const btn = container.querySelector('button');
    if (btn) btn.click();

    // Trigger update phase
    const s = (template as any).__signal;
    if (s) {
      s(true);
      flushMount();
    }

    expect(calls).toBeLessThanOrEqual(2);
    suppressed.restore();
  });
});

describe("handler stacking", () => {
  afterEach(() => {
    clearErrorHandlers();
    document.body.innerHTML = '<div id="app"></div>';
  });

  test("supports multiple handlers, first non-null wins", () => {
    const order: string[] = [];

    onError(() => {
      order.push('first');
      return null;
    });
    onError(() => {
      order.push('second');
      return html`<span>Second</span>` as HellaNode;
    });
    onError(() => {
      order.push('third');
      return html`<span>Third</span>` as HellaNode;
    });

    const container = setupContainer();
    mount(html`<div>${() => { throw new Error('test'); }}</div>`, container);

    expect(order).toEqual(['first', 'second']);
    expect(container.textContent).toBe('Second');
  });

  test("remove function unregisters handler", () => {
    let firstCalled = false;
    const remove = onError(() => {
      firstCalled = true;
      return html`<span>First</span>` as HellaNode;
    });

    remove();
    onError(() => html`<span>Second</span>` as HellaNode);

    const container = setupContainer();
    mount(html`<div>${() => { throw new Error('test'); }}</div>`, container);

    expect(firstCalled).toBe(false);
    expect(container.textContent).toBe('Second');
  });

  test("clearErrorHandlers removes all handlers", () => {
    const suppressed = suppressConsole();

    onError(() => html`<span>H1</span>` as HellaNode);
    onError(() => html`<span>H2</span>` as HellaNode);
    clearErrorHandlers();

    const container = setupContainer();
    mount(html`<div>${() => { throw new Error('test'); }}</div>`, container);

    expect(suppressed.errors.length).toBeGreaterThan(0);
    expect(suppressed.errors[0][0]).toContain('[HellaJS]');
    suppressed.restore();
  });

  test("useful for library integration (tracking + UI)", () => {
    const tracked: Error[] = [];

    const remove = onError((error) => {
      tracked.push(error);
      return null;
    });
    onError((error) => html`<span>Error: ${error.message}</span>` as HellaNode);

    const container = setupContainer();
    mount(html`<div>${() => { throw new Error('tracked'); }}</div>`, container);

    expect(tracked.length).toBe(1);
    expect(tracked[0]!.message).toBe('tracked');
    expect(container.textContent).toBe('Error: tracked');

    remove();
  });
});

describe("reset capability", () => {
  afterEach(() => {
    clearErrorHandlers();
    document.body.innerHTML = '<div id="app"></div>';
  });

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
});

describe("fallback placement", () => {
  afterEach(() => {
    clearErrorHandlers();
    document.body.innerHTML = '<div id="app"></div>';
  });

  test("error replaces boundary content (event and update)", () => {
    onError((error, context) => context.config?.fallback?.(error) ?? html`<span>Default</span>` as HellaNode);

    // Event phase
    const c1 = setupContainer();
    mount(html`
      <div id="b" error:fallback=${() => html`<span>FB</span>`}>
        <button id="btn" on:click=${() => { throw new Error('click'); }}>X</button>
        <span id="sib">Sibling</span>
      </div>
    `, c1);

    expect((c1.querySelector('#btn') as HTMLElement)).not.toBeNull();
    (c1.querySelector('#btn') as HTMLElement)!.click();
    expect(c1.querySelector('#b')?.children.length).toBe(1);
    expect(c1.textContent).toBe('FB');

    // Update phase
    const s = signal(false);
    const c2 = setupContainer();
    mount(html`
      <div id="b2" error:fallback=${() => html`<span>FB</span>`}>
        <span>${() => { if (s()) throw new Error('up'); return 'OK'; }}</span>
        <span id="other">Other</span>
      </div>
    `, c2);

    expect(c2.querySelector('#other')).not.toBeNull();
    s(true);
    flushMount();
    expect(c2.querySelector('#b2')?.children.length).toBe(1);
    expect(c2.textContent).toBe('FB');
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
    onError((error, context) => context.config?.fallback?.(error) ?? html`<span>Default</span>` as HellaNode);

    const container = setupContainer();
    mount(html`
      <div id="b" error:fallback=${() => html`<span>Mount FB</span>`}>
        ${() => { throw new Error('direct'); }}
      </div>
    `, container);

    expect(container.querySelector('#b')?.textContent).toContain('Mount FB');
  });
});

describe("boundary resolution", () => {
  afterEach(() => {
    clearErrorHandlers();
    document.body.innerHTML = '<div id="app"></div>';
  });

  test("caches resolved boundary on error-origin element", () => {
    onError((error, context) => context.config?.fallback?.(error) ?? html`<span>E</span>` as HellaNode);

    const container = setupContainer();
    mount(html`
      <div id="b" error:fallback=${() => html`<span>F</span>`}>
        <div id="mid">
          <span id="deep">
            <button id="btn" on:click=${() => { throw new Error('click'); }}>X</button>
          </span>
        </div>
      </div>
    `, container);

    const btn = (container.querySelector('#btn') as HTMLElement) as Element;
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    flushMount();

    expect((btn as any).__hella_cached_boundary?.id).toBe('b');
  });

  test("uses cached boundary for repeated errors", () => {
    onError((error, context) => context.config?.fallback?.(error) ?? html`<span>E</span>` as HellaNode);

    const shouldThrow = signal(false);
    const container = setupContainer();
    mount(html`
      <div id="b" error:fallback=${() => html`<span>F</span>`}>
        <span id="deep">${() => { if (shouldThrow()) throw new Error('up'); return 'OK'; }}</span>
      </div>
    `, container);

    const deep = container.querySelector('#deep') as Element;

    shouldThrow(true);
    flushMount();
    expect((deep as any).__hella_cached_boundary?.id).toBe('b');

    shouldThrow(false);
    flushMount();
    shouldThrow(true);
    flushMount();

    expect((deep as any).__hella_cached_boundary?.id).toBe('b');
  });
});

describe("explicit boundary designation", () => {
  afterEach(() => {
    clearErrorHandlers();
    document.body.innerHTML = '<div id="app"></div>';
  });

  test("error:boundary explicitly marks boundary", () => {
    onError((error, context) => context.config?.fallback?.(error) ?? html`<span>D</span>` as HellaNode);

    const container = setupContainer();
    mount(html`
      <div id="explicit" error:boundary error:fallback=${() => html`<span>FB</span>`}>
        <button on:click=${() => { throw new Error('click'); }}>X</button>
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
        <span id="child"><button on:click=${() => { throw new Error('click'); }}>X</button></span>
      </div>
    `, container);

    container.querySelector('button')!.click();
    expect(container.textContent).toBe('Global');
    expect(container.querySelector('#child')).not.toBeNull();
  });

  test("error:fallback implicitly creates boundary", () => {
    onError((error, context) => context.config?.fallback?.(error) ?? html`<span>D</span>` as HellaNode);

    const container = setupContainer();
    mount(html`
      <div id="implicit" error:fallback=${() => html`<span>FB</span>`}>
        <button on:click=${() => { throw new Error('click'); }}>X</button>
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
          <button on:click=${() => { throw new Error('click'); }}>X</button>
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
        <button on:click=${() => { throw new Error('click'); }}>X</button>
      </div>
    `, container);

    container.querySelector('button')!.click();
    expect(container.textContent).toBe('Handler FB');
  });
});

describe("edge cases", () => {
  afterEach(() => {
    clearErrorHandlers();
    document.body.innerHTML = '<div id="app"></div>';
  });

  test("error handler throws is caught and logged", () => {
    const suppressed = suppressConsole();

    onError(() => { throw new Error('Handler error'); });

    const container = setupContainer();
    mount(html`
      <div error:fallback=${() => html`<span>E</span>`}>
        ${() => { throw new Error('Original'); }}
      </div>
    `, container);

    expect(suppressed.errors.some((e: any[]) => e[0]?.includes?.('handler threw'))).toBe(true);
    suppressed.restore();
  });

  test("cache invalidation when boundary config is removed", () => {
    const suppressed = suppressConsole();

    onError((error, context) => context.config?.fallback?.(error) ?? html`<span>E</span>` as HellaNode);

    const shouldThrow = signal(false);
    const container = setupContainer();
    mount(html`
      <div id="b" error:fallback=${() => html`<span>F</span>`}>
        <span id="deep">${() => { if (shouldThrow()) throw new Error('up'); return 'OK'; }}</span>
      </div>
    `, container);

    const deep = container.querySelector('#deep') as Element;

    shouldThrow(true);
    flushMount();
    expect((deep as any).__hella_cached_boundary).toBeDefined();

    const boundary = container.querySelector('#b') as any;
    delete boundary.__hella_error_config;

    shouldThrow(false);
    flushMount();
    shouldThrow(true);
    flushMount();

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
      <div><span><button on:click=${() => { throw new Error('click'); }}>X</button></span></div>
    `, container);

    container.querySelector('button')!.click();
    expect(receivedConfig).toBeUndefined();
  });

  test("beforeMount hook error is caught and handled", () => {
    onError((error, context) => context.config?.fallback?.(error) ?? html`<span>E</span>` as HellaNode);

    const container = setupContainer();
    mount(html`
      <div error:fallback=${() => html`<span>FB</span>`}>
        <span hook:beforeMount=${() => { throw new Error('hook'); }}>Content</span>
      </div>
    `, container);

    expect(container.textContent).toContain('Content');
  });

  test("bind error replaces boundary content when boundary exists", () => {
    onError((error, context) => context.config?.fallback?.(error) ?? html`<span>E</span>` as HellaNode);

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
    onError((error) => html`<span>E: ${error.message}</span>` as HellaNode);

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

  test("direct event handler error is caught with boundary", () => {
    onError((error, context) => context.config?.fallback?.(error) ?? html`<span>E</span>` as HellaNode);

    const container = setupContainer();
    mount(html`
      <div id="b" error:fallback=${(e: Error) => html`<span>FB: ${e.message}</span>`}>
        <button id="btn" e:click=${() => { throw new Error('direct'); }}>X</button>
        <span id="sib">Sibling</span>
      </div>
    `, container);

    expect((container.querySelector('#btn') as HTMLElement)).not.toBeNull();

    (container.querySelector('#btn') as HTMLElement)!.click();

    expect(container.textContent).toBe('FB: direct');
    expect((container.querySelector('#btn') as HTMLElement)).toBeNull();
    expect(container.querySelector('#sib')).toBeNull();
  });

  test("direct event handler error without boundary replaces element", () => {
    const suppressed = suppressConsole();
    onError((error) => html`<span>E: ${error.message}</span>` as HellaNode);

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

  test("effect error in registry.addEffect is caught", () => {
    onError((error) => html`<span>E: ${error.message}</span>` as HellaNode);

    const shouldThrow = signal(false);
    const container = setupContainer();
    mount(html`
      <div id="test">${() => { if (shouldThrow()) throw new Error('effect'); return 'OK'; }}</div>
    `, container);

    expect(container.textContent).toBe('OK');

    shouldThrow(true);
    flushMount();

    expect(container.textContent).toBe('E: effect');
  });
});
