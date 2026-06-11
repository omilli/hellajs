import { describe, test, expect, beforeEach, mock } from "bun:test"
import { mount, html, onError, clearErrorHandlers, peekState } from "@hellajs/dom/bundle"
import type { HellaNode } from "@hellajs/dom"

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>'
})

describe("dom", () => {
  describe("mount", () => {
    test("mounts static and dynamic content", () => {
      mount(html`<div id="static">Hello</div>`)
      expect(document.getElementById("static")?.textContent).toBe("Hello")

      const nested = html`<div><span>Nested</span></div>` as HellaNode
      expect(nested.children![0] as HellaNode).toHaveProperty("tag", "span")

      const multi = html`<div>A</div><div>B</div>` as HellaNode
      expect(multi.tag).toBe("$")
      expect(multi.children!.length).toBe(2)

      const selfClose = html`<input type="text" placeholder="Enter" />` as HellaNode
      expect(selfClose.tag).toBe("input")
      expect(selfClose.props!.type).toBe("text")

      const bool = html`<input disabled />` as HellaNode
      expect(bool.props!.disabled).toBe(true)
    })

    test("renders reactive signals", () => {
      const count = signal(0)
      const className = signal("initial")

      mount(html`<div id="reactive" bind:class=${className}>${count}</div>`)
      const el = document.getElementById("reactive")!

      expect(el.textContent).toBe("0")
      expect(el.className).toBe("initial")

      count(42)
      flush()
      expect(el.textContent).toBe("42")

      className("updated")
      flush()
      expect(el.className).toBe("updated")
    })

    test("handles computed values", () => {
      const a = signal(1)
      const b = signal(2)

      mount(html`<div id="computed">${a} + ${b} = ${() => a() + b()}</div>`)
      const el = document.getElementById("computed")!

      expect(el.textContent).toBe("1 + 2 = 3")

      a(10)
      b(20)
      flush()
      expect(el.textContent).toBe("10 + 20 = 30")
    })

    test("conditionals without falsy strings", () => {
      const show = signal(true)
      const value = signal<string | null | undefined>("content")

      mount(html`
        <div id="cond-container">
          <span id="toggle">${() => show() ? html`<b>Yes</b>` : html`<b>No</b>`}</span>
          <span id="nullable">${() => value()}</span>
          <span id="static-falsy">before${false}${null}${undefined}after</span>
        </div>
      `)

      expect(document.querySelector("#toggle b")?.textContent).toBe("Yes")

      show(false)
      flush()
      expect(document.querySelector("#toggle b")?.textContent).toBe("No")

      expect(document.getElementById("nullable")?.textContent).toBe("content")

      value(null)
      flush()
      expect(document.getElementById("nullable")?.textContent).toBe("")
      expect(document.getElementById("nullable")?.textContent).not.toContain("null")

      value(undefined)
      flush()
      expect(document.getElementById("nullable")?.textContent).toBe("")

      expect(document.getElementById("static-falsy")?.textContent).toBe("beforeafter")

      value("0")
      flush()
      const zeroSig = signal(0)
      mount(html`<span id="zero">${zeroSig}</span>`)
      expect(document.getElementById("zero")?.textContent).toBe("0")
    })

    test("event handlers fire and delegate", () => {
      let clicked = 0
      let delegatedClicked = 0

      mount(html`
        <div id="event-container">
          <button id="btn" on:click=${() => clicked++}>Click</button>
          <div id="parent" on:click=${() => delegatedClicked++}>
            <span id="child">Child</span>
          </div>
        </div>
      `)

      document.getElementById("btn")!.dispatchEvent(new MouseEvent("click", { bubbles: true }))
      expect(clicked).toBe(1)

      document.getElementById("child")!.dispatchEvent(new MouseEvent("click", { bubbles: true }))
      expect(delegatedClicked).toBe(1)

      let hovers = 0
      mount(html`<div id="multi" on:click=${() => clicked++} on:mouseenter=${() => hovers++}></div>`)
      const multi = document.getElementById("multi")!

      multi.dispatchEvent(new Event("click"))
      multi.dispatchEvent(new Event("mouseenter"))
      expect(clicked).toBe(2)
      expect(hovers).toBe(1)
    })

    test("static and reactive props", () => {
      const isDisabled = signal(true)

      mount(html`
        <button
          id="prop-test"
          type="submit"
          data-custom="value"
          bind:disabled=${() => isDisabled() ? "disabled" : false}
        >
          Submit
        </button>
      `)

      const btn = document.getElementById("prop-test") as HTMLButtonElement
      expect(btn.getAttribute("type")).toBe("submit")
      expect(btn.getAttribute("data-custom")).toBe("value")
      expect(btn.hasAttribute("disabled")).toBe(true)

      isDisabled(false)
      flush()
      expect(btn.hasAttribute("disabled")).toBe(false)

      mount(html`<input id="null-prop" readonly=${null} />`)
      expect(document.getElementById("null-prop")?.hasAttribute("readonly")).toBe(false)
    })

    test("fragments and dynamic fragments", () => {
      const items = signal(["a", "b"])

      mount(html`
        <div id="frag-container">
          <span>Static 1</span><span>Static 2</span>
          ${() => ({ tag: "$", children: items().map(i => ({ tag: "em", children: [i] })) })}
        </div>
      `)

      const container = document.getElementById("frag-container")!
      expect(container.querySelectorAll("span").length).toBe(2)
      expect(container.querySelectorAll("em").length).toBe(2)

      items(["x", "y", "z"])
      flush()
      expect(container.querySelectorAll("em").length).toBe(3)
      expect(container.querySelectorAll("em")[2]?.textContent).toBe("z")
    })
  })

  describe("mount targets", () => {
    test("mounts to selector or element", () => {
      mount(html`<div id="default">Default</div>`)
      expect(document.getElementById("default")).not.toBeNull()

      document.body.innerHTML = '<div id="custom"></div>'
      mount(html`<span>Custom</span>`, "#custom")
      expect(document.querySelector("#custom span")).not.toBeNull()

      const container = document.createElement("div")
      document.body.appendChild(container)
      mount(html`<b>Direct</b>`, container)
      expect(container.querySelector("b")?.textContent).toBe("Direct")
    })
  })

  describe("mount edge cases", () => {
    test("resolveNode with raw Node instance appends directly", () => {
      const rawSpan = document.createElement("span")
      rawSpan.id = "raw-node"
      rawSpan.textContent = "raw"

      mount(html`<div id="raw-parent">${rawSpan}</div>`)
      expect(document.querySelector("#raw-parent #raw-node")?.textContent).toBe("raw")
    })

    test("__scope transfers to mounted DOM element", () => {
      const disposed = mock(() => {})
      const Comp = () => {
        scope(() => {})
        const node = html`<div id="scoped-comp">Comp</div>` as HellaNode
        node.__scope = disposed
        return node
      }

      mount(html`<div><${Comp} /></div>`)

      const el = document.getElementById("scoped-comp")!
      expect(typeof peekState(el)?.componentScope).toBe("function")
    })

    test("error config transfers to element during mount", () => {
      onError((err, ctx) => ctx.config?.fallback?.(err) ?? null)

      const fallback = (_err: Error) => html`<span id="fallback">${_err.message}</span>` as HellaNode
      mount(html`
        <div id="boundary" error:boundary error:fallback=${fallback}>
          ${() => { throw new Error("mount error") }}
        </div>
      `)

      expect(document.getElementById("fallback")).not.toBeNull()
      clearErrorHandlers()
    })
  })

  describe("mount binding", () => {
    test("value set via direct property with falsy fallback", () => {
      const inputValue = signal("hello")

      mount(html`
        <div>
          <input id="val-input" bind:value=${inputValue} />
        </div>
      `)

      const valInput = document.getElementById("val-input") as HTMLInputElement

      expect(valInput.value).toBe("hello")

      inputValue("")
      flush()

      expect(valInput.value).toBe("")

      inputValue("restored")
      flush()
      expect(valInput.value).toBe("restored")
    })
  })
});
