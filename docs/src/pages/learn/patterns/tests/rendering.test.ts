import { describe, test, expect, beforeEach } from "bun:test"
import { mount, html, ForEach } from "@hellajs/dom/bundle"

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>'
})

describe("rendering patterns", () => {
  test("reactive class names toggle with signal state", () => {
    const isActive = signal(false)

    const activeState = () => isActive() ? "btn-active" : "btn-inactive"

    const template = html`<div id="el" bind:class=${activeState}>Toggle</div>`

    mount(template, "#app")

    const el = document.getElementById("el")!
    expect(el.className).toBe("btn-inactive")

    isActive(true)
    flush()
    expect(el.className).toBe("btn-active")
  })

  test("conditional class arrays filter falsy values", () => {
    const status = signal("active")

    const taskState = () => [
      "task-item",
      status() === "active" && "task-active",
      status() === "done" && "task-done",
      status() === "error" && "task-error"
    ].filter(Boolean).join(" ")

    const template = html`<div id="el" bind:class=${taskState}>Task</div>`

    mount(template, "#app")

    const el = document.getElementById("el")!
    expect(el.className).toBe("task-item task-active")

    status("done")
    flush()
    expect(el.className).toBe("task-item task-done")
  })

  test("two-way input binding with bind:value and on:input", () => {
    const name = signal("")

    const setName = (e: Event) => {
      const input = e.target as HTMLInputElement
      name(input.value)
    }

    const template = html`<div>
      <input id="input" bind:value=${name} on:input=${setName} placeholder="Enter name" />
      <p id="greeting">Hello, ${name}</p>
    </div>`

    mount(template, "#app")

    const input = document.getElementById("input") as HTMLInputElement
    const greeting = document.getElementById("greeting")!
    expect(input.value).toBe("")
    expect(greeting.textContent).toBe("Hello, ")

    name("Alice")
    flush()
    expect(input.value).toBe("Alice")
    expect(greeting.textContent).toBe("Hello, Alice")
  })

  test("conditional rendering with function references", () => {
    const showPanel = signal(false)

    const togglePanel = () => showPanel(!showPanel())

    const panelTemplate = () => showPanel() && html`<div id="panel" class="panel">Panel content</div>`;

    const template = html`<div>
      <button id="toggle" on:click=${togglePanel}>Toggle Panel</button>
      ${panelTemplate}
    </div>`

    mount(template, "#app")

    expect(document.getElementById("panel")).toBe(null)

    showPanel(true)
    flush()
    const panel = document.getElementById("panel")
    expect(panel).not.toBe(null)
    expect(panel?.textContent).toBe("Panel content")
  })

  test("keyed list rendering with ForEach", () => {
    const items = signal([
      { id: 1, text: "First" },
      { id: 2, text: "Second" }
    ])

    const itemTemplate = (item: { id: number; text: string }) => html`<li key=${item.id}>${item.text}</li>`

    const template = html`<ul id="list">
      <${ForEach} each=${items} use=${itemTemplate} />
    </ul>`

    mount(template, "#app")

    const list = document.getElementById("list")!
    expect(list.querySelectorAll("li").length).toBe(2)
    expect(list.querySelectorAll("li")[0]!.textContent).toBe("First")
    expect(list.querySelectorAll("li")[1]!.textContent).toBe("Second")

    items([
      { id: 2, text: "Second updated" },
      { id: 3, text: "Third" }
    ])
    flush()

    const liEls = list.querySelectorAll("li")
    expect(liEls.length).toBe(2)
    expect(liEls[0]!.textContent).toBe("Second updated")
    expect(liEls[1]!.textContent).toBe("Third")
  })

  test("dynamic component from signal", () => {
    const HomePage = html`<h1 id="page">Home</h1>`
    const AboutPage = html`<h1 id="page">About</h1>`

    const currentPage = signal(HomePage)

    const template = html`<div>
      <nav>
        <button id="home-btn" on:click=${() => currentPage(HomePage)}>Home</button>
        <button id="about-btn" on:click=${() => currentPage(AboutPage)}>About</button>
      </nav>
      ${currentPage}
    </div>`

    mount(template, "#app")

    expect(document.getElementById("page")?.textContent).toBe("Home")

    currentPage(AboutPage)
    flush()
    expect(document.getElementById("page")?.textContent).toBe("About")
  })
})
