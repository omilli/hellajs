import { describe, test, expect, beforeEach } from "bun:test"
import { element, html } from "@hellajs/dom/bundle"

beforeEach(() => {
  document.body.innerHTML = ""
})

describe("custom elements: element()", () => {
  test("element defines a custom element that renders", async () => {
    element("docs-counter", (props) => {
      const count = signal(Number(props.initial?.()) || 0)
      return html`<div>
        <span id="ce-val">${count}</span>
        <button id="ce-btn" on:click=${() => count(count() + 1)}>+</button>
      </div>`
    })

    document.body.innerHTML = "<docs-counter></docs-counter>"

    await delay(0)
    const val = document.getElementById("ce-val")
    expect(val?.textContent).toBe("0")

    const btn = document.getElementById("ce-btn") as HTMLButtonElement
    btn.click()
    flush()
    expect(document.getElementById("ce-val")?.textContent).toBe("1")
  })

  test("element receives reactive props from attributes", async () => {
    element("docs-greeter", (props) => html`<div id="ce-greeting">${() => `Hello, ${props.name?.() ?? "World"}!`}</div>`)

    document.body.innerHTML = '<docs-greeter name="HellaJS"></docs-greeter>'

    await delay(0)
    expect(document.getElementById("ce-greeting")?.textContent).toBe("Hello, HellaJS!")
  })
})
