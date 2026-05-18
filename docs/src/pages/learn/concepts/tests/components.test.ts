import { describe, test, expect, beforeEach, mock } from "bun:test"
import { mount, html } from "@hellajs/dom/bundle"

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>'
})

describe("components — composition", () => {
  test("components compose through props and children", () => {
    const Card = (props: { title: string; variant?: string; children?: unknown }) => html`
      <div class="card-${props.variant ?? "default"}">
        <div class="card-header"><h2 id="title">${props.title}</h2></div>
        <div class="card-content" id="content">${props.children}</div>
      </div>
    `

    const template = html`<${Card} title="Welcome" variant="highlighted">
      <p id="inner">Hello</p>
    <//>`

    mount(template, "#app")

    expect(document.getElementById("title")?.textContent).toBe("Welcome")
    expect(document.getElementById("inner")?.textContent).toBe("Hello")
  })

  test("button component receives click handler via props", () => {
    const clicked = signal(false)

    const Button = (props: { variant?: string; click: () => void; children?: unknown }) => html`
      <button id="btn" on:click=${props.click}>${props.children}</button>
    `

    const template = html`<${Button} click=${() => clicked(true)}>Click Me<//>`

    mount(template, "#app")

    const btn = document.getElementById("btn") as HTMLButtonElement
    btn.click()

    expect(clicked()).toBe(true)
  })
})

describe("components — signal prop data flow", () => {
  test("passing signal as prop maintains reactivity", () => {
    const TodoCard = ({ todo }: { todo: () => { text: string; done: boolean } }) => html`
      <div class="todo-card">
        <span id="text">${() => todo().text}</span>
        <span id="status">${() => todo().done ? "Completed" : "Pending"}</span>
      </div>
    `

    const selectedTodo = signal({ text: "Learn HellaJS", done: false })

    const template = html`<div>
      <${TodoCard} todo=${selectedTodo} />
      <button id="switch" on:click=${() => selectedTodo({ text: "Build app", done: true })}>Switch</button>
    </div>`

    mount(template, "#app")

    expect(document.getElementById("text")?.textContent).toBe("Learn HellaJS")
    expect(document.getElementById("status")?.textContent).toBe("Pending")

    ;(document.getElementById("switch") as HTMLButtonElement).click()
    flush()

    expect(document.getElementById("text")?.textContent).toBe("Build app")
    expect(document.getElementById("status")?.textContent).toBe("Completed")
  })
})

describe("components — scope cleanup", () => {
  test("effects inside component scope run on mount", () => {
    const tracker = mock((..._args: unknown[]) => {})
    const count = signal(0)

    const Timer = () => {
      effect(() => tracker(`Count: ${count()}`))
      return html`<div id="timer">${count}</div>`
    }

    mount(Timer, "#app")

    expect(tracker).toHaveBeenCalledTimes(1)
    expect(tracker).toHaveBeenCalledWith("Count: 0")

    count(1)
    expect(tracker).toHaveBeenCalledTimes(2)
    expect(tracker).toHaveBeenCalledWith("Count: 1")
  })
})
