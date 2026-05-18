import { describe, test, expect, beforeEach, mock } from "bun:test"

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>'
})

describe("counter tutorial", () => {
  test("signal starts at initial value and updates on set", () => {
    const count = signal(0)

    expect(count()).toBe(0)

    count(count() + 1)
    expect(count()).toBe(1)
  })

  test("derived isEven and message react to count changes", () => {
    const count = signal(0)

    const isEven = () => count() % 2 === 0
    const message = () =>
      count() === 0 ? "Click to start!" :
        isEven() ? `${count()} is even` : `${count()} is odd`

    expect(message()).toBe("Click to start!")

    count(1)
    expect(isEven()).toBe(false)
    expect(message()).toBe("1 is odd")

    count(2)
    expect(isEven()).toBe(true)
    expect(message()).toBe("2 is even")
  })

  test("decrement disabled at zero, increment and reset work", () => {
    const count = signal(0)

    expect(count() === 0).toBe(true)

    count(count() + 1)
    count(count() + 1)
    expect(count()).toBe(2)

    count(count() - 1)
    expect(count()).toBe(1)

    count(0)
    expect(count()).toBe(0)
  })

  test("effect runs side effect when count changes", () => {
    const count = signal(0)
    const tracker = mock((..._args: unknown[]) => {})

    effect(() => {
      tracker(`Counter: ${count()}`)
    })

    expect(tracker).toHaveBeenCalledTimes(1)
    expect(tracker).toHaveBeenCalledWith("Counter: 0")

    count(5)
    expect(tracker).toHaveBeenCalledTimes(2)
    expect(tracker).toHaveBeenCalledWith("Counter: 5")
  })

  test("bind:class toggles based on isEven derived value", () => {
    const count = signal(0)
    const isEven = () => count() % 2 === 0
    const classFn = () => `mb-4 ${isEven() ? 'text-green-600' : 'text-blue-600'}`

    expect(classFn()).toBe("mb-4 text-green-600")

    count(1)
    expect(classFn()).toBe("mb-4 text-blue-600")
  })
})
