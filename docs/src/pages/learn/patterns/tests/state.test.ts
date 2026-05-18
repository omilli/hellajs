import { describe, test, expect } from "bun:test"
import { store } from "@hellajs/store/bundle"
import ts from "typescript"

describe("state patterns", () => {
  test("store with validation middleware trims and clamps values", () => {
    const form = store({
      name: "",
      email: "",
      age: 0,
    }, {
      middleware: {
        name: (v: string) => v.trim(),
        email: (v: string) => v.toLowerCase().trim(),
        age: (v: number) => Math.min(150, Math.max(0, v)),
      },
    })

    form.name("  John  ")
    form.email(" JOHN@MAIL.COM ")
    form.age(200)

    expect(form.name()).toBe("John")
    expect(form.email()).toBe("john@mail.com")
    expect(form.age()).toBe(150)
  })

  test("partial deep updates preserve unchanged properties", () => {
    const app = store({
      user: { name: "Alice", role: "viewer" },
      theme: "light",
    })

    app.update({
      user: { name: "Bob" },
    })

    expect(app.user.name()).toBe("Bob")
    expect(app.user.role()).toBe("viewer")
    expect(app.theme()).toBe("light")
  })

  test("mutable draft updates handle array operations", () => {
    const todos = store({
      items: [
        { id: 1, text: "Write tests", done: false },
        { id: 2, text: "Ship it", done: false },
      ],
      count: 2,
    })

    todos.update(draft => {
      draft.items.push({ id: 3, text: "Refactor", done: false })
      draft.items = draft.items.filter(item => item.id !== 1)
      draft.count = draft.items.length
    })

    const items = todos.items()
    expect(items.length).toBe(2)
    expect(items[0]!.id).toBe(2)
    expect(items[1]!.id).toBe(3)
    expect(todos.count()).toBe(2)
  })

  test("readonly properties prevent writes", () => {
    const config = store({
      apiUrl: "https://api.example.com",
      theme: "light",
      debug: false,
    }, {
      readonly: ["apiUrl"],
    })

    config.theme("dark")
    expect(config.theme()).toBe("dark")

    // @ts-expect-error
    config.apiUrl("localhost")
    expect(config.apiUrl()).toBe("https://api.example.com")
  })

  test("store composition shares signal references", () => {
    const userStore = store({
      name: "Alice",
      role: "admin",
    })

    const uiStore = store({
      sidebar: true,
      theme: "dark",
    })

    const appStore = store({
      user: userStore,
      ui: uiStore,
    })

    appStore.user.name("Bob")
    expect(userStore.name()).toBe("Bob")

    expect(appStore.ui.theme()).toBe("dark")
  })

  test("store snapshot provides reactive plain object", () => {
    const cart = store({
      items: [{ id: 1, price: 10 }, { id: 2, price: 20 }],
      discount: 0.1,
    })

    const total = computed(() => {
      const { items, discount } = cart.snapshot()
      const subtotal = items.reduce((sum: number, item: { price: number }) => sum + item.price, 0)
      return subtotal * (1 - discount)
    })

    expect(total()).toBe(27)

    cart.update({ discount: 0.2 })
    expect(total()).toBe(24)
  })
})
