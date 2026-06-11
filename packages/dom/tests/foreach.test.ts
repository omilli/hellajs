import { describe, test, expect, beforeEach } from "bun:test"
import { mount, html, ForEach } from "@hellajs/dom/bundle"
import type { HellaNode, HellaChild } from "@hellajs/dom"
import type { Signal } from "@hellajs/core"

interface TestItem {
  id: number
  name?: string
  label?: string
}

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>'
})

describe("dom", () => {
  describe("ForEach", () => {
    const createList = <T>(items: T[] | (() => T[]), itemRenderer?: (item: T) => HellaChild): HellaNode =>
      html`<ul><${ForEach} each=${items} use=${itemRenderer || ((item: T) => html`<li key=${item}>Item ${item}</li>`)} /></ul>` as HellaNode

    const getListTexts = () => Array.from(document.querySelectorAll("li")).map(li => li.textContent)

    describe("basic rendering", () => {
      test("renders, updates, and reorders lists", () => {
        const items = signal([1, 2, 3])
        mount(() => createList(items))

        expect(getListTexts()).toEqual(["Item 1", "Item 2", "Item 3"])

        items([2, 3, 4])
        flush()
        expect(getListTexts()).toEqual(["Item 2", "Item 3", "Item 4"])

        items([3, 1, 2])
        flush()
        expect(getListTexts()).toEqual(["Item 3", "Item 1", "Item 2"])

        items([])
        flush()
        expect(document.querySelectorAll("li").length).toBe(0)
        const ul = document.querySelector("ul")
        expect(ul?.childNodes[0]?.nodeType).toBe(Node.COMMENT_NODE)

        items([5, 6])
        flush()
        expect(getListTexts()).toEqual(["Item 5", "Item 6"])
      })

      test("html ForEach syntax", () => {
        const items = signal(["a", "b", "c"])

        mount(html`
          <ul>
            <${ForEach} each=${items} use=${(item: string) => html`<li>${item}</li>`} />
          </ul>
        `)

        expect(getListTexts()).toEqual(["a", "b", "c"])

        items(["x", "y"])
        flush()
        expect(getListTexts()).toEqual(["x", "y"])
      })

      test("empty-to-empty update is a no-op", () => {
        const items = signal<number[]>([])
        mount(() => createList(items))

        const commentsBefore = Array.from(document.querySelector("ul")!.childNodes)
          .filter(n => n.nodeType === Node.COMMENT_NODE).length
        expect(commentsBefore).toBe(2)

        items([])
        flush()

        const commentsAfter = Array.from(document.querySelector("ul")!.childNodes)
          .filter(n => n.nodeType === Node.COMMENT_NODE).length
        expect(commentsAfter).toBe(2)
        expect(document.querySelectorAll("li").length).toBe(0)
      })

      test("duplicate keys keep last-wins semantics", () => {
        const items = signal([1, 2, 1])
        mount(() => createList(items))

        expect(getListTexts()).toEqual(["Item 1", "Item 2", "Item 1"])

        items([1, 1, 3])
        flush()
        expect(getListTexts()).toEqual(["Item 1", "Item 1", "Item 3"])
      })
    })

    describe("LIS reconciliation", () => {
      test("LIS algorithm minimizes moves", () => {
        const items = signal([1, 2, 3, 4, 5])
        mount(() => createList(items))
        expect(document.querySelectorAll("li").length).toBe(5)

        items([3, 1, 2, 5, 4])
        flush()
        expect(getListTexts()).toEqual(["Item 3", "Item 1", "Item 2", "Item 5", "Item 4"])
      })

      test("uses item.id as fallback key", () => {
        const alice = { id: 1, name: "Alice" }
        const bob = { id: 2, name: "Bob" }
        const charlie = { id: 3, name: "Charlie" }
        const items = signal<TestItem[]>([alice, bob, charlie])

        const renderer = (item: TestItem) => html`<li>${item.name}</li>`
        mount(() => createList(items, renderer))

        expect(getListTexts()).toEqual(["Alice", "Bob", "Charlie"])

        const liNodes = Array.from(document.querySelectorAll("li"))
        const aliceNode = liNodes[0]
        const bobNode = liNodes[1]
        const charlieNode = liNodes[2]

        items([charlie, alice, bob])
        flush()

        const reorderedNodes = Array.from(document.querySelectorAll("li"))
        expect(getListTexts()).toEqual(["Charlie", "Alice", "Bob"])

        expect(reorderedNodes[0]).toBe(charlieNode)
        expect(reorderedNodes[1]).toBe(aliceNode)
        expect(reorderedNodes[2]).toBe(bobNode)

        items([alice, charlie, bob])
        flush()

        const swappedNodes = Array.from(document.querySelectorAll("li"))
        expect(swappedNodes[0]).toBe(aliceNode)
        expect(swappedNodes[1]).toBe(charlieNode)
        expect(swappedNodes[2]).toBe(bobNode)
      })
    })

    describe("key resolution", () => {
      test("uses item.id as fallback key for non-HellaNode use return", () => {
        const alice = { id: 1, name: signal("Alice") }
        const bob = { id: 2, name: signal("Bob") }
        const items = signal([alice, bob])

        mount(html`
          <ul>
            <${ForEach} each=${items} use=${(item: typeof alice) => item.name} />
          </ul>
        `)

        expect(document.querySelector("ul")?.textContent).toBe("AliceBob")

        items([bob, alice])
        flush()

        expect(document.querySelector("ul")?.textContent).toBe("BobAlice")
      })
    })

    describe("fast paths", () => {
      test("complete replacement fast path", () => {
        const items = signal<TestItem[]>([{ id: 1, name: "A" }, { id: 2, name: "B" }])
        const renderer = (item: TestItem) => html`<li key=${item.id}>${item.name}</li>`

        mount(() => createList(items, renderer))
        expect(getListTexts()).toEqual(["A", "B"])

        items([{ id: 10, name: "X" }, { id: 20, name: "Y" }, { id: 30, name: "Z" }])
        flush()
        expect(getListTexts()).toEqual(["X", "Y", "Z"])
      })

      test("zero overlap replacement fast path", () => {
        const items = signal<TestItem[]>([{ id: 1, name: "A" }, { id: 2, name: "B" }, { id: 3, name: "C" }])
        const renderer = (item: TestItem) => html`<li key=${item.id}>${item.name}</li>`

        mount(() => createList(items, renderer))
        expect(getListTexts()).toEqual(["A", "B", "C"])

        items([{ id: 100, name: "X" }, { id: 200, name: "Y" }])
        flush()
        expect(getListTexts()).toEqual(["X", "Y"])
      })

      test("no-change fast path skips DOM", () => {
        const items = signal([1, 2, 3])
        let domOps = 0

        const origRemove = Element.prototype.removeChild
        const origInsert = Element.prototype.insertBefore
        Element.prototype.removeChild = function <T extends Node>(child: T): T { domOps++; return origRemove.call(this, child) as T }
        Element.prototype.insertBefore = function <T extends Node>(node: T, ref: Node | null): T { domOps++; return origInsert.call(this, node, ref) as T }

        mount(() => createList(items))
        const initial = domOps

        items([1, 2, 3])
        flush()
        expect(domOps).toBe(initial)

        Element.prototype.removeChild = origRemove
        Element.prototype.insertBefore = origInsert
      })

      test("clears large lists efficiently", () => {
        const buildData = (start: number, count: number): TestItem[] =>
          Array.from({ length: count }, (_, i) => ({ id: start + i, label: `Item ${start + i}` }))

        const items = signal(buildData(1, 100))
        mount(html`
          <div>
            <${ForEach}
              each=${items}
              use=${(item: TestItem) => html`<div key=${item.id} class="item">${item.label}</div>`}
            />
          </div>
        `)

        expect(document.querySelectorAll(".item").length).toBe(100)

        items([...items(), ...buildData(101, 100)])
        flush()
        expect(document.querySelectorAll(".item").length).toBe(200)

        items([])
        flush()
        expect(document.querySelectorAll(".item").length).toBe(0)
      })
    })

    describe("reactive content", () => {
      test("same key reuses DOM nodes with new references", () => {
        const items = signal<TestItem[]>([
          { id: 1, name: "Alice" },
          { id: 2, name: "Bob" }
        ])

        const renderer = (item: TestItem) => html`<li key=${item.id}>${item.name}</li>`
        mount(() => createList(items, renderer))

        expect(getListTexts()).toEqual(["Alice", "Bob"])

        const firstNodes = Array.from(document.querySelectorAll("li"))

        items([{ id: 1, name: "Alice Updated" }, { id: 2, name: "Bob Updated" }])
        flush()

        const updatedNodes = Array.from(document.querySelectorAll("li"))
        expect(updatedNodes[0]).toBe(firstNodes[0])
        expect(updatedNodes[1]).toBe(firstNodes[1])
      })

      test("signal children persist through key-only reconciliation", () => {
        const name1 = signal("Alice")
        const name2 = signal("Bob")
        interface ReactiveItem { id: number; name: Signal<string> }
        const items = signal<ReactiveItem[]>([
          { id: 1, name: name1 },
          { id: 2, name: name2 }
        ])

        mount(html`
          <ul>
            <${ForEach}
              each=${items}
              use=${(item: ReactiveItem) => html`<li key=${item.id}>${item.name}</li>`}
            />
          </ul>
        `)

        expect(getListTexts()).toEqual(["Alice", "Bob"])
        const firstNodes = Array.from(document.querySelectorAll("li"))

        name1("ALICE")
        flush()
        expect(getListTexts()).toEqual(["ALICE", "Bob"])

        items([{ id: 1, name: name1 }, { id: 2, name: name2 }])
        flush()
        expect(getListTexts()).toEqual(["ALICE", "Bob"])

        const reusedNodes = Array.from(document.querySelectorAll("li"))
        expect(reusedNodes[0]).toBe(firstNodes[0])
        expect(reusedNodes[1]).toBe(firstNodes[1])
      })

      test("handles fragments and nested structures", () => {
        const items = signal([1, 2])
        const fragmentRenderer = (item: number) => html`<li>Item ${item}</li><span>(${item})</span>` as HellaNode

        mount(() => createList(items, fragmentRenderer))
        expect(document.querySelectorAll("li").length).toBe(2)
        expect(document.querySelectorAll("span").length).toBe(2)
      })

      test("preserves sibling elements during updates", () => {
        const items = signal([1, 2])
        const showEmpty = signal(false)

        mount(html`
          <div class="wrapper">
            <${ForEach}
              each=${items}
              use=${(item: number) => html`<div class="item">${item}</div>`}
            />
            <p class="footer">Always visible</p>
            ${() => showEmpty() && html`<p class="empty">No items</p>`}
          </div>
        `)

        expect(document.querySelectorAll(".item").length).toBe(2)
        expect(document.querySelector(".footer")?.textContent).toBe("Always visible")

        items([])
        showEmpty(true)
        flush()

        expect(document.querySelectorAll(".item").length).toBe(0)
        expect(document.querySelector(".footer")).not.toBeNull()
        expect(document.querySelector(".empty")?.textContent).toBe("No items")
      })

      test("dynamic signals update independently", () => {
        const signals = [signal("A"), signal("B")]
        mount(html`<span><${ForEach} each=${signals} use=${(item: Signal<string>) => item} /></span>`)

        expect(document.querySelector("span")?.textContent).toBe("AB")

        signals[0]?.("X")
        flush()
        expect(document.querySelector("span")?.textContent).toBe("XB")
      })

      test("swap operations with reactive content", () => {
        interface ReactiveRow {
          id: number
          label: Signal<string>
        }
        const rows = signal<ReactiveRow[]>([
          { id: 1, label: signal("Item 1") },
          { id: 2, label: signal("Item 2") }
        ])
        const selected = signal<number | undefined>(undefined)

        mount(html`
          <table>
            <tbody>
              <${ForEach}
                each=${rows}
                use=${(row: ReactiveRow) => html`
                  <tr key=${row.id}>
                    <td>${row.id}</td>
                    <td><a class="lbl" on:click=${() => selected(row.id)}>${row.label}</a></td>
                  </tr>
                `}
              />
            </tbody>
          </table>
        `)

        ;(document.querySelector(".lbl") as HTMLElement).click()
        flush()
        expect(selected()).toBe(1)

        const list = [...rows()]
        ;[list[0], list[1]] = [list[1]!, list[0]!]
        rows(list)
        flush()

        const links = document.querySelectorAll(".lbl")
        ;(links[1] as HTMLElement).click()
        flush()
        expect(selected()).toBe(1)
      })
    })
  })
});
