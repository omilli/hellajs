import { describe, test, expect, beforeEach } from "bun:test"
import { mount, html, ForEach, Portal, Lazy } from "@hellajs/dom/bundle"

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div><div id="modal-root"></div>'
})

describe("control flow — conditional rendering", () => {
  test("function reference makes conditional reactive", () => {
    const count = signal(0)

    const template = html`<div>
      <span id="val">${count}</span>
      <span id="doubled">${() => count() * 2}</span>
      <span id="parity">${() => count() % 2 === 0 ? "even" : "odd"}</span>
      <div id="gt5">${() => count() > 5 && html`<span>Great job!</span>`}</div>
      <button id="btn" on:click=${() => count(count() + 1)}>+</button>
    </div>`

    mount(template, "#app")

    expect(document.getElementById("val")?.textContent).toBe("0")
    expect(document.getElementById("doubled")?.textContent).toBe("0")
    expect(document.getElementById("parity")?.textContent).toBe("even")
    expect(document.getElementById("gt5")?.textContent).toBe("")

    for (let i = 0; i < 6; i++) {
      (document.getElementById("btn") as HTMLButtonElement).click()
    }
    flush()

    expect(document.getElementById("val")?.textContent).toBe("6")
    expect(document.getElementById("doubled")?.textContent).toBe("12")
    expect(document.getElementById("parity")?.textContent).toBe("even")
    expect(document.getElementById("gt5")?.textContent).toContain("Great job!")
  })
})

describe("control flow — ForEach", () => {
  test("ForEach renders list and updates reactively", () => {
    const todos = signal([
      { id: 1, text: "Learn HellaJS", done: false },
      { id: 2, text: "Build an app", done: false },
    ])

    const template = html`<ul id="list">
      <${ForEach} each=${todos} use=${(todo: { id: number; text: string; done: boolean }) => html`<li key=${todo.id}>${todo.text}</li>`} />
    </ul>`

    mount(template, "#app")

    const list = document.getElementById("list")!
    expect(list.querySelectorAll("li")).toHaveLength(2)

    todos([...todos(), { id: 3, text: "Write tests", done: false }])
    flush()
    expect(list.querySelectorAll("li")).toHaveLength(3)
    expect(list.querySelectorAll("li")[2]?.textContent).toBe("Write tests")
  })
})

describe("control flow — Portal", () => {
  test("Portal renders content to different DOM location", () => {
    const isOpen = signal(false)

    const template = html`<div>
      <button id="open" on:click=${() => isOpen(true)}>Open</button>
      ${() => isOpen() && html`<${Portal} to="#modal-root" type="append">
        <div id="modal-content">Modal content</div>
      <//>`}
    </div>`

    mount(template, "#app")

    expect(document.getElementById("modal-content")).toBe(null)

    isOpen(true)
    flush()
    expect(document.getElementById("modal-content")?.textContent).toBe("Modal content")

    const modalRoot = document.getElementById("modal-root")!
    expect(modalRoot.contains(document.getElementById("modal-content"))).toBe(true)
  })
})

describe("control flow — Lazy", () => {
  test("Lazy loads component asynchronously", async () => {
    const Resolved = () => html`<div id="resolved">Loaded</div>`

    const loader = () => delay(10).then(() => Resolved)

    const template = html`<div>
      <${Lazy} loader=${loader} loading=${html`<span id="loading">Loading...</span>`} />
    </div>`

    mount(template, "#app")

    expect(document.getElementById("loading")?.textContent).toBe("Loading...")

    await delay(50)
    flush()
    expect(document.getElementById("resolved")?.textContent).toBe("Loaded")
  })
})
