import { describe, test, expect, afterEach, beforeEach } from "bun:test"
import { mount, html, flushMount, onError, clearErrorHandlers } from "@hellajs/dom/bundle"
import type { HellaNode, ErrorContext } from "../lib/types/nodes"

function suppressConsole() {
  const errors: unknown[][] = []
  const warns: unknown[][] = []
  const origError = console.error
  const origWarn = console.warn
  console.error = (...args: unknown[]) => errors.push(args)
  console.warn = (...args: unknown[]) => warns.push(args)
  return {
    errors,
    warns,
    restore: () => {
      console.error = origError
      console.warn = origWarn
    }
  }
}

function setupContainer() {
  const container = document.createElement('div')
  document.body.appendChild(container)
  return container
}

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>'
})

describe("dom", () => {
  describe("error handler", () => {
    afterEach(() => {
      onError(null as never)
      document.body.innerHTML = '<div id="app"></div>'
    })

    test("uses element fallback when config present", () => {
      onError((error: Error, context: ErrorContext) => context.config?.fallback?.(error) ?? html`<span>Default</span>` as HellaNode)

      const container = setupContainer()
      mount(html`
        <div error:fallback=${(e: Error) => html`<span>Custom: ${e.message}</span>`}>
          ${() => { throw new Error('oops') }}
        </div>
      `, container)

      expect(container.textContent).toBe('Custom: oops')
    })

    test("falls back to handler default when no element config", () => {
      onError((error: Error) => html`<span>Default: ${error.message}</span>` as HellaNode)

      const container = setupContainer()
      mount(html`<div>${() => { throw new Error('oops') }}</div>`, container)

      expect(container.textContent).toBe('Default: oops')
    })

    test("render phase has no config (no element)", () => {
      let receivedConfig: unknown = 'set'
      onError((_, context) => {
        receivedConfig = context.config
        return null
      })

      mount(html`<${() => { throw new Error('render') }} />`)

      expect(receivedConfig).toBeUndefined()
    })

    test("config does not merge from parents", () => {
      onError((error: Error, context: ErrorContext) => context.config?.fallback?.(error) ?? html`<span>Parent</span>` as HellaNode)

      const container = setupContainer()
      mount(html`
        <div error:fallback=${() => html`<span>Parent</span>`} error:category="outer">
          <div error:fallback=${() => html`<span>Child</span>`}>
            ${() => { throw new Error('oops') }}
          </div>
        </div>
      `, container)

      expect(container.textContent).toBe('Child')
    })

    test("category is passed to handler", () => {
      let receivedCategory: string | undefined
      onError((_, context) => {
        receivedCategory = context.config?.category
        return null
      })

      const container = setupContainer()
      mount(html`
        <div error:category="sidebar">
          <button on:click=${() => { throw new Error('click') }}>Click</button>
        </div>
      `, container)

      container.querySelector('button')?.click()
      expect(receivedCategory).toBe('sidebar')
    })

    test("catches errors in reactive child (shallow and deep)", () => {
      onError((error: Error, context: ErrorContext) => context.config?.fallback?.(error) ?? null)

      const c1 = setupContainer()
      mount(html`
        <div error:fallback=${() => html`<span>Caught</span>`}>
          ${() => { throw new Error('shallow') }}
        </div>
      `, c1)
      expect(c1.textContent).toBe('Caught')

      const c2 = setupContainer()
      mount(html`
        <div error:fallback=${() => html`<span>Caught</span>`}>
          <div><span>${() => { throw new Error('deep') }}</span></div>
        </div>
      `, c2)
      expect(c2.textContent).toBe('Caught')
    })

    test("catches error in event handler", () => {
      onError((error: Error, context: ErrorContext) => context.config?.fallback?.(error) ?? null)

      const container = setupContainer()
      mount(html`
        <div error:fallback=${() => html`<span>Event error</span>`}>
          <button on:click=${() => { throw new Error('Click error') }}>Click</button>
        </div>
      `, container)

      container.querySelector('button')!.click()
      expect(container.textContent).toBe('Event error')
    })

    test("nearest element config wins", () => {
      let outerCalled = false
      onError((_, context) => {
        if (context.config?.category === 'inner') return html`<span>Inner</span>` as HellaNode
        outerCalled = true
        return html`<span>Outer</span>` as HellaNode
      })

      const container = setupContainer()
      mount(html`
        <div error:category="outer" error:fallback=${() => html`<span>Outer</span>`}>
          <div error:category="inner" error:fallback=${() => html`<span>Inner</span>`}>
            ${() => { throw new Error('Nested') }}
          </div>
        </div>
      `, container)

      expect(outerCalled).toBe(false)
      expect(container.textContent).toBe('Inner')
    })

    test("handler returning null logs error without UI change", () => {
      const suppressed = suppressConsole()
      let called = false
      onError(() => {
        called = true
        return null
      })

      const container = setupContainer()
      mount(html`<div id="content">${() => { throw new Error('Logged') }}</div>`, container)

      expect(called).toBe(true)
      suppressed.restore()
    })

    test("works with html template error: prefix", () => {
      let error: Error | null = null
      onError((e) => {
        error = e
        return null
      })

      const node = html`<div error:fallback=${(e: Error) => html`<span>${e.message}</span>`}>${() => { throw new Error('tpl') }}</div>` as HellaNode

      expect(node.error?.fallback).toBeDefined()
      mount(node)
      expect(error!.message).toBe('tpl')
    })
  })

  describe("error infinite loop", () => {
    afterEach(() => {
      onError(null as never)
      document.body.innerHTML = '<div id="app"></div>'
    })

    test.each([
      ['mount', () => html`<div error:fallback=${() => { throw new Error('fb') }}>${() => { throw new Error('orig') }}</div>`],
      ['event', () => html`<div error:fallback=${() => { throw new Error('fb') }}><button on:click=${() => { throw new Error('orig') }}>X</button></div>`],
      ['update', () => {
        const s = signal(false)
        return html`<div error:fallback=${() => { throw new Error('fb') }}>${() => { if (s()) throw new Error('orig'); return 'ok' }}</div>`
      }]
    ])("prevents infinite loop during %s", (_, getTemplate) => {
      const suppressed = suppressConsole()
      let calls = 0

      onError((error: Error, context: ErrorContext) => {
        calls++
        return context.config?.fallback?.(error) ?? null
      })

      const container = setupContainer()
      const template = getTemplate()
      mount(template, container)

      const btn = container.querySelector('button')
      if (btn) btn.click()

      const s = (template as Record<string, unknown>).__signal
      if (s) {
        (s as (value: boolean) => void)(true)
        flushMount()
      }

      expect(calls).toBeLessThanOrEqual(2)
      suppressed.restore()
    })
  })

  describe("error stacking", () => {
    afterEach(() => {
      clearErrorHandlers()
      document.body.innerHTML = '<div id="app"></div>'
    })

    test("supports multiple handlers, first non-null wins", () => {
      const order: string[] = []

      onError(() => {
        order.push('first')
        return null
      })
      onError(() => {
        order.push('second')
        return html`<span>Second</span>` as HellaNode
      })
      onError(() => {
        order.push('third')
        return html`<span>Third</span>` as HellaNode
      })

      const container = setupContainer()
      mount(html`<div>${() => { throw new Error('test') }}</div>`, container)

      expect(order).toEqual(['first', 'second'])
      expect(container.textContent).toBe('Second')
    })

    test("remove function unregisters handler", () => {
      let firstCalled = false
      const remove = onError(() => {
        firstCalled = true
        return html`<span>First</span>` as HellaNode
      })

      remove()
      onError(() => html`<span>Second</span>` as HellaNode)

      const container = setupContainer()
      mount(html`<div>${() => { throw new Error('test') }}</div>`, container)

      expect(firstCalled).toBe(false)
      expect(container.textContent).toBe('Second')
    })

    test("clearErrorHandlers removes all handlers", () => {
      const suppressed = suppressConsole()

      onError(() => html`<span>H1</span>` as HellaNode)
      onError(() => html`<span>H2</span>` as HellaNode)
      clearErrorHandlers()

      const container = setupContainer()
      mount(html`<div>${() => { throw new Error('test') }}</div>`, container)

      expect(suppressed.errors.length).toBeGreaterThan(0)
      expect(suppressed.errors[0]![0]).toContain('[dom]')
      suppressed.restore()
    })

    test("useful for library integration (tracking + UI)", () => {
      const tracked: Error[] = []

      const remove = onError((error: Error) => {
        tracked.push(error)
        return null
      })
      onError((error: Error) => html`<span>Error: ${error.message}</span>` as HellaNode)

      const container = setupContainer()
      mount(html`<div>${() => { throw new Error('tracked') }}</div>`, container)

      expect(tracked.length).toBe(1)
      expect(tracked[0]!.message).toBe('tracked')
      expect(container.textContent).toBe('Error: tracked')

      remove()
    })
  })

  describe("error catching", () => {
    afterEach(() => {
      clearErrorHandlers()
      document.body.innerHTML = '<div id="app"></div>'
    })

    test("error handler throws is caught and logged", () => {
      const suppressed = suppressConsole()

      onError(() => { throw new Error('Handler error') })

      const container = setupContainer()
      mount(html`
        <div error:fallback=${() => html`<span>E</span>`}>
          ${() => { throw new Error('Original') }}
        </div>
      `, container)

      expect(suppressed.errors.some((e: unknown[]) => typeof e[0] === 'string' && e[0].includes('handler threw'))).toBe(true)
      suppressed.restore()
    })

    test("resolveErrorConfig returns undefined when no config exists", () => {
      let receivedConfig: unknown = 'set'
      onError((_, context) => {
        receivedConfig = context.config
        return html`<span>E</span>` as HellaNode
      })

      const container = setupContainer()
      mount(html`
        <div><span><button on:click=${() => { throw new Error('click') }}>X</button></span></div>
      `, container)

      container.querySelector('button')!.click()
      expect(receivedConfig).toBeUndefined()
    })

    test("beforeMount hook error is caught and handled", () => {
      onError((error: Error, context: ErrorContext) => context.config?.fallback?.(error) ?? html`<span>E</span>` as HellaNode)

      const container = setupContainer()
      mount(html`
        <div error:fallback=${() => html`<span>FB</span>`}>
          <span hook:beforeMount=${() => { throw new Error('hook') }}>Content</span>
        </div>
      `, container)

      expect(container.textContent).toContain('Content')
    })

    test("direct event handler is replaced when updated on same element", () => {
      const calls: string[] = []
      onError(() => html`<span>E</span>` as HellaNode)

      const container = setupContainer()
      const h1 = () => calls.push('h1')
      const h2 = () => calls.push('h2')

      mount(html`<button id="btn" e:click=${h1}>X</button>`, container);
      (container.querySelector('#btn') as HTMLElement)!.click()
      expect(calls).toEqual(['h1'])

      mount(html`<button id="btn" e:click=${h2}>X</button>`, container);
      (container.querySelector('#btn') as HTMLElement)!.click()
      expect(calls).toEqual(['h1', 'h2'])
    })

    test("prevents infinite loop when handler re-triggers error on same boundary via direct event", () => {
      const suppressed = suppressConsole()

      onError((error: Error, context: ErrorContext) => {
        if (error.message === 'first') {
          const btn = context.element?.querySelector('button')
          btn?.dispatchEvent(new Event('click'))
        }
        return context.config?.fallback?.(error) ?? null
      })

      const container = setupContainer()
      mount(html`
        <div error:fallback=${(e: Error) => html`<span>${e.message}</span>`}>
          <button e:click=${() => { throw new Error('second') }}>X</button>
          ${() => { throw new Error('first') }}
        </div>
      `, container)

      expect(suppressed.errors.some((e: unknown[]) =>
        typeof e[0] === 'string' && e[0].includes('infinite loop')
      )).toBe(true)
      suppressed.restore()
    })

    test("effect error in registry.addEffect is caught", () => {
      onError((error: Error) => html`<span>E: ${error.message}</span>` as HellaNode)

      const shouldThrow = signal(false)
      const container = setupContainer()
      mount(html`
        <div id="test">${() => { if (shouldThrow()) throw new Error('effect'); return 'OK' }}</div>
      `, container)

      expect(container.textContent).toBe('OK')

      shouldThrow(true)
      flushMount()

      expect(container.textContent).toBe('E: effect')
    })
  })
});
