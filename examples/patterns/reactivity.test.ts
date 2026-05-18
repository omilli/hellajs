import { describe, test, expect, mock } from "bun:test"

describe("reactivity patterns", () => {
  test("derived state chains computed values from multiple signals", () => {
    const firstName = signal("Jane")
    const lastName = signal("Doe")
    const fullName = computed(() => `${firstName()} ${lastName()}`)

    firstName("John")
    expect(fullName()).toBe("John Doe")
  })

  test("batched updates run dependent effects once", () => {
    const tracker = mock((..._args: unknown[]) => {})
    const x = signal(1)
    const y = signal(2)
    const sum = computed(() => x() + y())

    effect(() => tracker(`Sum: ${sum()}`))

    batch(() => {
      x(10)
      y(20)
    })

    expect(tracker).toHaveBeenCalledTimes(2)
    expect(tracker).toHaveBeenLastCalledWith("Sum: 30")
  })

  test("effect cleanup stops tracking and disposes resources", () => {
    let intervalId: ReturnType<typeof setInterval> | null = null
    const active = signal(true)

    const cleanup = effect(() => {
      if (!active()) return
      intervalId = setInterval(() => { }, 1000)
      return () => { if (intervalId !== null) clearInterval(intervalId) }
    })

    cleanup()
    active(false)
    // Effect is disposed — setting signal won't re-trigger
  })

  test("conditional dependencies track only signals read during execution", () => {
    const view = signal<"a" | "b">("a")
    const a = signal(1)
    const b = signal(2)

    const tracker = mock((..._args: unknown[]) => {})
    const value = computed(() => {
      const result = view() === "a" ? a() : b()
      tracker()
      return result
    })

    value()
    expect(tracker).toHaveBeenCalledTimes(1)

    b(99)
    value()
    expect(tracker).toHaveBeenCalledTimes(1) // b is not a dependency

    view("b")
    expect(value()).toBe(99)
    expect(tracker).toHaveBeenCalledTimes(2) // now tracks b instead of a
  })

  test("untracked reads access signals without creating dependencies", () => {
    const data = signal("hello")
    const logPrefix = signal("[app]")
    const tracker = mock((..._args: unknown[]) => {})

    effect(() => {
      const prefix = untracked(() => logPrefix())
      tracker(`${prefix} ${data()}`)
    })

    expect(tracker).toHaveBeenCalledTimes(1)
    expect(tracker).toHaveBeenCalledWith("[app] hello")

    logPrefix("[debug]")
    expect(tracker).toHaveBeenCalledTimes(1) // effect does NOT re-run

    data("world")
    expect(tracker).toHaveBeenCalledTimes(2)
    expect(tracker).toHaveBeenCalledWith("[debug] world")
  })

  test("scope wraps multiple effects with single cleanup", () => {
    const userId = signal(1)
    const tracker = mock((..._args: unknown[]) => {})

    const cleanup = scope(() => {
      effect(() => tracker(`User: ${userId()}`))
      effect(() => tracker(`Loading data for ${userId()}...`))
    })

    userId(2)
    expect(tracker).toHaveBeenCalledTimes(4) // 2 initial + 2 from update

    cleanup()
    userId(3)
    expect(tracker).toHaveBeenCalledTimes(4) // no more runs after cleanup
  })
})
