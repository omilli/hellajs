import { describe, test, expect, beforeEach } from "bun:test"
import { mount, html, onError, clearErrorHandlers } from "@hellajs/dom/bundle"
import type { HellaNode } from "@hellajs/dom"

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>'
  clearErrorHandlers()
})

function suppressConsole() {
  const origError = console.error
  console.error = (..._args: unknown[]) => {}
  return { restore: () => { console.error = origError } }
}

describe("error handling — global onError", () => {
  test("onError catches errors and returns fallback", () => {
    const { restore } = suppressConsole()
    onError((error, _context) => {
      return html`<div id="global-fallback">Error: ${error.message}</div>`
    })

    const shouldFail = signal(false)

    const template = html`<div>
      ${() => {
        if (shouldFail()) throw new Error("boom")
        return html`<span id="ok">OK</span>`
      }}
    </div>`

    mount(template, "#app")
    expect(document.getElementById("ok")?.textContent).toBe("OK")

    shouldFail(true)
    flush()
    expect(document.getElementById("global-fallback")?.textContent).toBe("Error: boom")
    restore()
  })
})

describe("error handling — error:fallback", () => {
  test("error:fallback shows local fallback on error", () => {
    const { restore } = suppressConsole()
    onError((error, context) => context.config?.fallback?.(error) ?? html`<span>Default</span>` as HellaNode)

    const shouldFail = signal(false)

    const template = html`<div error:fallback=${(e: Error) => html`<span id="local-fallback">${e.message}</span>`}>
      ${() => {
        if (shouldFail()) throw new Error("local error")
        return html`<span id="ok">OK</span>`
      }}
    </div>`

    mount(template, "#app")
    expect(document.getElementById("ok")?.textContent).toBe("OK")

    shouldFail(true)
    flush()
    expect(document.getElementById("local-fallback")?.textContent).toBe("local error")
    restore()
  })
})
