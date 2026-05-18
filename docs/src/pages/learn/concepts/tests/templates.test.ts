import { describe, test, expect, beforeEach } from "bun:test"
import { mount, html } from "@hellajs/dom/bundle"

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>'
})

describe("templates — reactive vs static bindings", () => {
  test("signal reference creates reactive text binding", () => {
    const count = signal(0)

    const template = html`<div id="el">${count}</div>`

    mount(template, "#app")

    const el = document.getElementById("el")!
    expect(el.textContent).toBe("0")

    count(5)
    flush()
    expect(el.textContent).toBe("5")
  })

  test("computed function creates reactive binding", () => {
    const count = signal(0)

    const template = html`<div id="el">${() => count() * 2}</div>`

    mount(template, "#app")

    const el = document.getElementById("el")!
    expect(el.textContent).toBe("0")

    count(3)
    flush()
    expect(el.textContent).toBe("6")
  })

  test("calling signal reads value once without reactivity", () => {
    const count = signal(0)

    const template = html`<div id="el">${count()}</div>`

    mount(template, "#app")

    const el = document.getElementById("el")!
    expect(el.textContent).toBe("0")

    count(5)
    flush()
    expect(el.textContent).toBe("0")
  })

  test("reactive conditional renders and removes elements", () => {
    const show = signal(false)

    const template = html`<div id="container">${() => show() && html`<span id="msg">visible</span>`}</div>`

    mount(template, "#app")

    expect(document.getElementById("msg")).toBe(null)

    show(true)
    flush()
    expect(document.getElementById("msg")?.textContent).toBe("visible")

    show(false)
    flush()
    expect(document.getElementById("msg")).toBe(null)
  })

  test("on:click handler updates signal", () => {
    const count = signal(0)

    const template = html`<div>
      <span id="val">${count}</span>
      <button id="btn" on:click=${() => count(count() + 1)}>+</button>
    </div>`

    mount(template, "#app")

    const btn = document.getElementById("btn") as HTMLButtonElement
    btn.click()
    flush()

    expect(document.getElementById("val")?.textContent).toBe("1")
  })
})
