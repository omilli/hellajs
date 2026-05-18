import { describe, test, expect, beforeEach } from "bun:test"
import { $ref, $collection, mount, html } from "@hellajs/dom/bundle"

beforeEach(() => {
  document.body.innerHTML = '<div id="app"><span class="counter">0</span><button class="btn">Go</button></div>'
})

describe("reactive refs — $ref single element", () => {
  test("$ref binds reactive text content", () => {
    const count = signal(0)

    $ref(".counter").bind(count)

    const el = document.querySelector(".counter") as HTMLElement
    expect(el.textContent).toBe("0")

    count(42)
    flush()
    expect(el.textContent).toBe("42")
  })

  test("$ref binds reactive attributes", () => {
    const active = signal(false)

    $ref(".btn").bind({ "data-active": () => active() ? "yes" : "no" })

    const btn = document.querySelector(".btn") as HTMLButtonElement
    expect(btn.dataset.active).toBe("no")

    active(true)
    flush()
    expect(btn.dataset.active).toBe("yes")
  })

  test("$ref attaches event handlers", () => {
    const count = signal(0)

    $ref(".btn").on("click", () => count(count() + 1))
    $ref(".counter").bind(count)

    const btn = document.querySelector(".btn") as HTMLButtonElement
    btn.click()
    flush()

    expect(document.querySelector(".counter")?.textContent).toBe("1")
  })

  test("$ref method chaining", () => {
    const count = signal(0)

    $ref(".counter")
      .bind(() => `Count: ${count()}`)
      .bind({ "data-active": () => count() > 0 ? "yes" : "no" })

    const el = document.querySelector(".counter") as HTMLElement
    expect(el.textContent).toBe("Count: 0")
    expect(el.dataset.active).toBe("no")

    count(5)
    flush()
    expect(el.textContent).toBe("Count: 5")
    expect(el.dataset.active).toBe("yes")
  })
})

describe("reactive refs — $collection multiple elements", () => {
  test("$collection binds to all matching elements", () => {
    document.body.innerHTML = '<div><span class="ind">a</span><span class="ind">b</span></div>'

    const status = signal("ready")

    $collection(".ind").bind(() => `Status: ${status()}`)

    const els = document.querySelectorAll(".ind")
    expect(els[0]?.textContent).toBe("Status: ready")
    expect(els[1]?.textContent).toBe("Status: ready")

    status("done")
    flush()
    expect(els[0]?.textContent).toBe("Status: done")
    expect(els[1]?.textContent).toBe("Status: done")
  })
})
