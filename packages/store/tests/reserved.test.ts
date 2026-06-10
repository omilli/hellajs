import { describe, test, expect } from "bun:test"
import { store } from "@hellajs/store/bundle"

describe("store", () => {
describe("reserved keys", () => {
  test("throws on snapshot key collision with non-function value", () => {
    expect(() => store({ snapshot: 1 })).toThrow("Reserved key \"snapshot\"")
  })

  test("throws on cleanup key collision with non-function value", () => {
    expect(() => store({ cleanup: "x" })).toThrow("Reserved key \"cleanup\"")
  })

  test("throws on nested reserved key collision", () => {
    expect(() => store({ nested: { snapshot: 1 } })).toThrow("Reserved key \"snapshot\"")
  })

  test("rejects function values on reserved keys via snapshot", () => {
    expect(() => store({ snapshot: () => "snap" })).toThrow("Reserved key \"snapshot\"")
  })

  test("rejects function values on reserved keys via update", () => {
    expect(() => store({ update: () => "helper" })).toThrow("Reserved key \"update\"")
  })

  test("rejects function value on cleanup reserved key", () => {
    expect(() => store({ cleanup: () => "dispose" })).toThrow("Reserved key \"cleanup\"")
  })

  test("update method skips keys not present in initial object", () => {
    const data = store({ a: 1 })
    data.update({ snapshot: "hijack" } as never)
    expect(data.snapshot()).toEqual({ a: 1 })
  })
})
})
