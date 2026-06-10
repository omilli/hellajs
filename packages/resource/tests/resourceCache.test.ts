import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test"
import { resource, resourceCache } from "@hellajs/resource/bundle"

describe("resourceCache", () => {
  beforeEach(() => {
    resourceCache.map.clear()
    resourceCache.setConfig({ maxSize: 1000, enableLRU: true })
  })

  afterEach(() => {
    resourceCache.map.clear()
  })

  test("setConfig merges configuration", () => {
    resourceCache.setConfig({ maxSize: 500 })
    expect(resourceCache.config.maxSize).toBe(500)
    expect(resourceCache.config.enableLRU).toBe(true)

    resourceCache.setConfig({ enableLRU: false })
    expect(resourceCache.config.maxSize).toBe(500)
    expect(resourceCache.config.enableLRU).toBe(false)
  })

  test("createKeyGenerator returns template function", () => {
    const generator = resourceCache.createKeyGenerator<{ id: number }>()
    const template = generator((params) => `user-${params.id}`)

    expect(template({ id: 1 })).toBe("user-1")
    expect(template({ id: 2 })).toBe("user-2")
  })

  describe("set/get", () => {
    test("set with cacheTime=0 does nothing", () => {
      resourceCache.set("key1", "data1", 0)
      expect(resourceCache.map.size).toBe(0)
    })

    test("get updates lastAccess for LRU", async () => {
      const originalNow = Date.now
      let mockTime = 1000
      Date.now = () => mockTime

      resourceCache.set("key1", "data1", 60000)
      const entry = resourceCache.map.get("key1")
      const originalAccess = entry?.lastAccess

      mockTime += 100
      resourceCache.get("key1")
      const updatedEntry = resourceCache.map.get("key1")
      expect(updatedEntry?.lastAccess).toBeGreaterThan(originalAccess!)

      Date.now = originalNow
    })

    test("get returns undefined and removes expired entry", () => {
      const originalNow = Date.now
      let mockTime = 1000
      Date.now = () => mockTime

      resourceCache.set("expiring-key", "data", 10)
      mockTime += 20

      const result = resourceCache.get<string>("expiring-key")
      expect(result).toBeUndefined()
      expect(resourceCache.map.has("expiring-key")).toBe(false)

      Date.now = originalNow
    })
  })

  describe("LRU eviction", () => {
    test("cleanup throttles to avoid excessive processing", async () => {
      resourceCache.map.clear()
      const originalNow = Date.now
      let mockTime = Date.now() + 100000
      Date.now = () => mockTime

      resourceCache.cleanup()

      resourceCache.set("key1", "data1", 10)
      mockTime += 5
      resourceCache.cleanup()
      expect(resourceCache.map.size).toBe(1)

      mockTime += 30
      resourceCache.cleanup()
      expect(resourceCache.map.size).toBe(1)

      mockTime += 60000
      resourceCache.cleanup()
      expect(resourceCache.map.size).toBe(0)

      Date.now = originalNow
    })

    test("evicts oldest entries when exceeding maxSize", () => {
      resourceCache.setConfig({ maxSize: 3, enableLRU: true })

      const originalNow = Date.now
      let mockTime = 1000
      Date.now = () => mockTime

      resourceCache.set("key1", "data1", 60000)
      mockTime += 100
      resourceCache.set("key2", "data2", 60000)
      mockTime += 100
      resourceCache.set("key3", "data3", 60000)

      mockTime += 100
      resourceCache.get("key1")

      mockTime += 100
      resourceCache.set("key4", "data4", 60000)
      mockTime += 100
      resourceCache.set("key5", "data5", 60000)

      expect(resourceCache.map.size).toBe(3)
      expect(resourceCache.get<string>("key1")).toBe("data1")
      expect(resourceCache.get("key2")).toBeUndefined()
      expect(resourceCache.get("key3")).toBeUndefined()
      expect(resourceCache.get<string>("key4")).toBe("data4")
      expect(resourceCache.get<string>("key5")).toBe("data5")

      Date.now = originalNow
    })
  })

  describe("invalidation", () => {
    test("invalidate removes single key", () => {
      resourceCache.set("key1", "data1", 60000)
      resourceCache.set("key2", "data2", 60000)

      resourceCache.invalidate("key1")

      expect(resourceCache.get<string>("key1")).toBeUndefined()
      expect(resourceCache.get<string>("key2")).toBe("data2")
    })

    test("invalidateMultiple removes multiple keys", () => {
      resourceCache.set("key1", "data1", 60000)
      resourceCache.set("key2", "data2", 60000)
      resourceCache.set("key3", "data3", 60000)

      resourceCache.invalidateMultiple(["key1", "key3"])

      expect(resourceCache.get("key1")).toBeUndefined()
      expect(resourceCache.get<string>("key2")).toBe("data2")
      expect(resourceCache.get("key3")).toBeUndefined()
    })

    test("invalidateResources calls invalidate on all resources", () => {
      const invalidate1 = mock(() => {})
      const invalidate2 = mock(() => {})

      resourceCache.invalidateResources([
        { invalidate: invalidate1 },
        { invalidate: invalidate2 }
      ])

      expect(invalidate1).toHaveBeenCalled()
      expect(invalidate2).toHaveBeenCalled()
    })
  })

  describe("update", () => {
    test("update with function updater", () => {
      resourceCache.set("key1", "initial", 60000)

      const success = resourceCache.update("key1", (old) => `${old}-updated`)
      expect(success).toBe(true)
      expect(resourceCache.get<string>("key1")).toBe("initial-updated")
    })

    test("update with direct value", () => {
      resourceCache.set("key1", "initial", 60000)

      const success = resourceCache.update("key1", "replaced")
      expect(success).toBe(true)
      expect(resourceCache.get<string>("key1")).toBe("replaced")
    })

    test("update returns false for non-existent key", () => {
      const success = resourceCache.update("nonexistent", "value")
      expect(success).toBe(false)
    })

    test("update returns false for expired entry", async () => {
      const originalNow = Date.now
      let mockTime = 1000
      Date.now = () => mockTime

      resourceCache.set("key1", "data", 10)
      mockTime += 20

      const success = resourceCache.update("key1", "updated")
      expect(success).toBe(false)
      expect(resourceCache.map.has("key1")).toBe(false)

      Date.now = originalNow
    })

    test("updateMultiple processes array of updates", () => {
      resourceCache.set("key1", "data1", 60000)
      resourceCache.set("key2", "data2", 60000)

      resourceCache.updateMultiple([
        { key: "key1", updater: (old) => `${old}-updated` },
        { key: "key2", updater: "replaced" }
      ])

      expect(resourceCache.get<string>("key1")).toBe("data1-updated")
      expect(resourceCache.get<string>("key2")).toBe("replaced")
    })

    test("setData with function updater updates cached data", async () => {
      const r = resource(() => delay("initial"), { cacheTime: 60000, key: () => "test-key" })

      r.fetch({ force: true })
      await delay(20)

      r.setData((old: string) => old ? `${old}-updated` : "updated")
      expect(resourceCache.get<string>("test-key")).toBe("initial-updated")
    })

    test("setData with direct value updates cached data", async () => {
      const r = resource(() => delay("initial"), { cacheTime: 60000, key: () => "test-key" })

      r.fetch({ force: true })
      await delay(20)

      r.setData("replaced")
      expect(resourceCache.get<string>("test-key")).toBe("replaced")
    })

    test("setData with function when cache miss and cacheTime > 0", () => {
      const r = resource(() => delay("initial"), { cacheTime: 60000, key: () => "test-key" })

      r.setData((old: string) => old ? `${old}-updated` : "new")
      expect(resourceCache.get<string>("test-key")).toBe("new")
    })

    test("setData ignores update when cacheTime is 0", () => {
      const r = resource(() => delay("initial"), { cacheTime: 0, key: () => "test-key" })

      r.setData("should-not-be-cached")
      expect(resourceCache.get<string>("test-key")).toBeUndefined()
    })
  })
})
