import { describe, test, expect, beforeEach } from "bun:test"
import { mount, html, flushMount } from "@hellajs/dom/bundle"

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>'
})

describe("attribute prefixes — on: delegated events", () => {
  test("on:click triggers handler on button click", () => {
    const count = signal(0)

    const template = html`<button id="btn" on:click=${() => count(count() + 1)}>
      ${count}
    </button>`

    mount(template, "#app")

    const btn = document.getElementById("btn") as HTMLButtonElement
    btn.click()
    flush()
    expect(btn.textContent).toBe("1")
  })
})

describe("attribute prefixes — e: direct events", () => {
  test("e:click fires on the element directly", () => {
    const clicked = signal(false)

    const template = html`<button id="btn" e:click=${() => clicked(true)}>Click</button>`

    mount(template, "#app")

    const btn = document.getElementById("btn") as HTMLButtonElement
    btn.click()

    expect(clicked()).toBe(true)
  })

  test("e:click and on:click can coexist on same element", () => {
    const delegated = signal(false)
    const direct = signal(false)

    const template = html`<button id="btn" on:click=${() => delegated(true)} e:click=${() => direct(true)}>Click</button>`

    mount(template, "#app")

    const btn = document.getElementById("btn") as HTMLButtonElement
    btn.click()

    expect(delegated()).toBe(true)
    expect(direct()).toBe(true)
  })
})

describe("attribute prefixes — bind: reactive attributes", () => {
  test("bind:class toggles reactively", () => {
    const isActive = signal(false)

    const template = html`<div id="el" bind:class=${() => isActive() ? "active" : "inactive"}>Content</div>`

    mount(template, "#app")

    const el = document.getElementById("el")!
    expect(el.className).toBe("inactive")

    isActive(true)
    flush()
    expect(el.className).toBe("active")
  })

  test("bind:value creates reactive input binding", () => {
    const name = signal("")

    const template = html`<input id="input" bind:value=${name} />`

    mount(template, "#app")

    const input = document.getElementById("input") as HTMLInputElement
    expect(input.value).toBe("")

    name("Alice")
    flush()
    expect(input.value).toBe("Alice")
  })

  test("bind:disabled toggles button state", () => {
    const count = signal(0)

    const template = html`<button id="btn" bind:disabled=${() => count() === 0}>Action</button>`

    mount(template, "#app")

    const btn = document.getElementById("btn") as HTMLButtonElement
    expect(btn.disabled).toBe(true)

    count(1)
    flush()
    expect(btn.disabled).toBe(false)
  })
})

describe("attribute prefixes — hook: lifecycle", () => {
  test("hook:afterMount fires after element is in DOM", () => {
    const mounted = signal(false)

    const template = html`<div id="el" hook:afterMount=${() => mounted(true)}>Content</div>`

    mount(template, "#app")

    expect(document.getElementById("el")).not.toBe(null)
    flushMount(document.getElementById("app")!)
    expect(mounted()).toBe(true)
  })
})
