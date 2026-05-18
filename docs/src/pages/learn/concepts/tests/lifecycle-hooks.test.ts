import { describe, test, expect, beforeEach } from "bun:test"
import { mount, html, flushMount } from "@hellajs/dom/bundle"

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>'
})

describe("lifecycle hooks — execution order", () => {
  test("hook:afterMount fires after element is in DOM", () => {
    const log: string[] = []

    const template = html`<div
      id="el"
      hook:afterMount=${() => log.push("afterMount")}
    >Content</div>`

    mount(template, "#app")

    expect(document.getElementById("el")).not.toBe(null)
    expect(log).toEqual([])

    flushMount(document.getElementById("app")!)
    expect(log).toEqual(["afterMount"])
  })

  test("hook:beforeUpdate and hook:afterUpdate fire on reactive changes", () => {
    const count = signal(0)
    const log: string[] = []

    const template = html`<div
      id="el"
      hook:beforeUpdate=${() => log.push(`beforeUpdate:${count()}`)}
      hook:afterUpdate=${() => log.push(`afterUpdate:${count()}`)}
    >${count}</div>`

    mount(template, "#app")
    flushMount(document.getElementById("app")!)
    expect(log).toEqual([])

    count(1)
    flush()
    expect(log).toEqual(["beforeUpdate:1", "afterUpdate:1"])

    count(2)
    flush()
    expect(log).toEqual(["beforeUpdate:1", "afterUpdate:1", "beforeUpdate:2", "afterUpdate:2"])
  })
})

describe("lifecycle hooks — with signal updates", () => {
  test("hooks work with interactive counter pattern", () => {
    const count = signal(0)
    const mountLog: string[] = []

    const Counter = () => html`<div
      hook:afterMount=${() => mountLog.push("mounted")}
    >
      <span id="val">${count}</span>
      <button id="btn" on:click=${() => count(count() + 1)}>+</button>
    </div>`

    mount(Counter, "#app")
    flushMount(document.getElementById("app")!)

    expect(mountLog).toEqual(["mounted"])
    expect(document.getElementById("val")?.textContent).toBe("0")

    ;(document.getElementById("btn") as HTMLButtonElement).click()
    flush()
    expect(document.getElementById("val")?.textContent).toBe("1")
  })
})
