import { describe, test, expect } from "bun:test"
import { store } from "@hellajs/store/bundle"

describe("store", () => {
describe("readonly", () => {
  test("all properties readonly", () => {
    const readonlyAll = store({ key: "value" }, { readonly: true })

    expect(readonlyAll.key()).toBe("value")
    expect(readonlyAll.key.length).toBe(0)
  })

  test("specific properties readonly", () => {
    const readonlyPartial = store({
      title: "Book",
      year: 2023,
      rating: 4.5
    }, { readonly: ["title"] })

    expect(readonlyPartial.title()).toBe("Book")
    readonlyPartial.year(2024)
    readonlyPartial.rating(5.0)

    expect(readonlyPartial.year()).toBe(2024)
    expect(readonlyPartial.rating()).toBe(5.0)
  })

  test("readonly properties not updated via update()", () => {
    const data = store({ locked: "original", writable: "a" }, { readonly: ["locked"] })

    data.update({ locked: "new", writable: "b" } as never)

    expect(data.locked()).toBe("original")
    expect(data.writable()).toBe("b")
  })

  test("readonly: true setter is a no-op at runtime", () => {
    const data = store({ count: 0, name: "init" }, { readonly: true })

    ;(data.count as unknown as (v: number) => void)(999)

    expect(data.count()).toBe(0)
    expect(data.name()).toBe("init")
  })

  test("readonly combined with middleware", () => {
    const data = store(
      { count: 0, name: "init" },
      { readonly: ["count"], middleware: { name: (v: string) => v.toUpperCase() } }
    )

    data.name("lower")
    expect(data.name()).toBe("LOWER")
    expect(data.count()).toBe(0)
  })

  test("readonly does not inherit to nested objects", () => {
    const data = store({
      config: { theme: "dark", lang: "en" }
    }, { readonly: true })

    expect(data.config.theme()).toBe("dark")
    expect(data.config.theme.length).toBe(1)

    data.config.theme("light")

    expect(data.config.theme()).toBe("light")
  })

  test("readonly array property is a no-op getter", () => {
    const data = store({
      items: [1, 2, 3],
      name: "list"
    }, { readonly: true })

    expect(data.items()).toEqual([1, 2, 3])
    expect(data.items.length).toBe(0)
  })

  test("readonly array setter is a no-op at runtime", () => {
    const data = store({
      items: [1, 2, 3]
    }, { readonly: true })

    ;(data.items as unknown as (v: number[]) => void)([4, 5, 6])

    expect(data.items()).toEqual([1, 2, 3])
  })

  test("specific readonly keys include array property", () => {
    const data = store({
      items: [1, 2],
      name: "mutable"
    }, { readonly: ["items"] })

    ;(data.items as unknown as (v: number[]) => void)([9])

    expect(data.items()).toEqual([1, 2])
    data.name("changed")
    expect(data.name()).toBe("changed")
  })

  test("readonly on nested object key does not make nested properties readonly", () => {
    const data = store({
      config: { theme: "dark" },
      name: "app"
    }, { readonly: ["config"] })

    expect(data.config.theme()).toBe("dark")
    data.config.theme("light")
    expect(data.config.theme()).toBe("light")

    data.name("changed")
    expect(data.name()).toBe("changed")
  })
})
})
