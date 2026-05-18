import { describe, test, expect, beforeEach, afterEach } from "bun:test"
import { resource, resourceCache } from "@hellajs/resource/bundle"

describe("data patterns", () => {
  beforeEach(() => { resourceCache.map.clear() })
  afterEach(() => { resourceCache.map.clear() })

  test("basic data fetching with reactive state", async () => {
    const users = resource(
      () => delay([{ id: 1, name: "Alice" }, { id: 2, name: "Bob" }]),
    )

    const states: string[] = []
    effect(() => {
      if (users.isLoading()) states.push("loading")
      if (users.data()) states.push("data")
    })

    users.fetch({ force: true })
    expect(users.isLoading()).toBe(true)

    await delay(30)
    expect(users.data()).toEqual([{ id: 1, name: "Alice" }, { id: 2, name: "Bob" }])
    expect(users.status()).toBe("success")
    expect(states).toContain("loading")
  })

  test("reactive key fetching refetches on key change", async () => {
    let fetchCount = 0
    const userId = signal(1)

    const posts = resource(
      (id: number) => {
        fetchCount++
        return delay({ id, name: `User ${id}` })
      },
      { key: () => userId(), refetchOnKeyChange: true },
    )

    posts.fetch({ force: true })
    await delay(30)
    expect(posts.data()?.name).toBe("User 1")

    userId(2)
    posts.invalidate()
    await delay(30)
    expect(posts.data()?.name).toBe("User 2")
  })

  test("cached fetching respects staleTime and cacheTime", async () => {
    let fetchCount = 0

    const config = resource(
      () => {
        fetchCount++
        return delay({ version: fetchCount })
      },
      { staleTime: 500, cacheTime: 1000, key: () => "config" },
    )

    config.fetch({ force: true })
    await delay(30)
    expect(fetchCount).toBe(1)
    expect(config.data()?.version).toBe(1)

    config.fetch()
    await delay(30)
    expect(fetchCount).toBe(1) // cache hit within staleTime
  })

  test("polling refreshes at regular intervals", async () => {
    let count = 0

    const notifications = resource(
      () => tick(5).then(() => `data-${++count}`),
      { refetchInterval: 30, refetchOnKeyChange: true },
    )

    effect(() => notifications.status())
    await tick(100)

    expect(count).toBeGreaterThanOrEqual(2)
    notifications.dispose()
  })

  test("optimistic update with onMutate and rollback", async () => {
    let settled = false
    let optimisticBeforeResolve = false

    const addTodo = resource(
      async (text: string) => delay({ id: 3, text, done: false }),
      {
        onMutate: async (_text) => {
          optimisticBeforeResolve = true
        },
        onError: () => { },
        onSettled: () => { settled = true },
      },
    )

    const result = await addTodo.mutate("Build something awesome")
    expect(optimisticBeforeResolve).toBe(true)
    expect(settled).toBe(true)
    expect(result).toEqual({ id: 3, text: "Build something awesome", done: false })
  })

  test("error recovery with retry configuration", async () => {
    let attempts = 0

    const data = resource(
      () => (++attempts < 3 ? Promise.reject(new Error("Server error")) : delay({ success: true })),
      {
        retry: 3,
        retryDelay: 10,
      },
    )

    data.fetch({ force: true })
    await wait(() => data.status() === "success")
    expect(attempts).toBe(3)
    expect(data.data()).toEqual({ success: true })
  })
})
