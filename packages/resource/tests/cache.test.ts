import { describe, test, expect, beforeEach } from "bun:test";
import { resource, resourceCache } from "../dist/resource";

const delay = <T>(val: T, ms: number = 10): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(val), ms));

const mockUser = { id: 1, name: "John Doe" };

describe("resource", () => {
  beforeEach(() => {
    resourceCache.setConfig({ maxSize: 1000, enableLRU: true });
  });

  test("caches data", async () => {
    let callCount = 0;
    const r = resource(
      () => {
        callCount++;
        return delay(mockUser, 5);
      },
      { cacheTime: 100 }
    );
    r.request();
    await delay(20);
    expect(r.data()).toEqual(mockUser);
    expect(callCount).toBe(1);
    r.get();
    expect(r.data()).toEqual(mockUser);
    expect(callCount).toBe(1);
  });

  test("skips cache when disabled", async () => {
    let callCount = 0;
    const r = resource(
      () => {
        callCount++;
        return delay(`Call ${callCount}`, 5);
      },
      { cacheTime: 0 }
    );
    r.request();
    await delay(20);
    expect(r.data()).toBe("Call 1");
    r.request();
    await delay(20);
    expect(r.data()).toBe("Call 2");
    expect(callCount).toBe(2);
  });

  test("returns cached data immediately", async () => {
    let callCount = 0;
    const r = resource(
      (k) => {
        callCount++;
        return delay({ key: k, data: `Data for ${k}` }, 5);
      },
      { cacheTime: 1000, key: () => "user-1" }
    );

    r.request();
    await delay(20);
    expect(r.data()?.data).toBe("Data for user-1");
    expect(callCount).toBe(1);

    r.get();
    expect(r.data()?.data).toBe("Data for user-1");
    await delay(20);
    expect(callCount).toBe(1);
  });

  test("cleans up expired cache entries", async () => {
    resourceCache.map.clear();

    let callCount = 0;
    const r = resource(
      () => {
        callCount++;
        return delay(`Call ${callCount}`, 5);
      },
      { cacheTime: 30 }
    );

    r.request();
    await delay(20);
    expect(r.data()).toBe("Call 1");
    expect(callCount).toBe(1);

    await delay(50);

    r.request();
    await delay(20);
    expect(r.data()).toBe("Call 2");
    expect(callCount).toBe(2);
  });

  test("respects cache size limits with LRU eviction", async () => {
    resourceCache.setConfig({ maxSize: 2, enableLRU: true });

    let callCount = 0;
    const fetcher = (key: number) => {
      callCount++;
      return delay(`data-${key}`, 5);
    };

    const r1 = resource(fetcher, { key: () => 1, cacheTime: 60000 });
    const r2 = resource(fetcher, { key: () => 2, cacheTime: 60000 });
    const r3 = resource(fetcher, { key: () => 3, cacheTime: 60000 });

    r1.request();
    await delay(20);
    r2.request();
    await delay(20);

    expect(r1.data()).toBe("data-1");
    expect(r2.data()).toBe("data-2");
    expect(callCount).toBe(2);

    r3.request();
    await delay(20);
    expect(r3.data()).toBe("data-3");
    expect(callCount).toBe(3);

    const r1Again = resource(fetcher, { key: () => 1, cacheTime: 60000 });
    r1Again.get();
    await delay(20);

    expect(callCount).toBe(4);
  });

  test("does not evict when cache is under limit", async () => {
    resourceCache.setConfig({ maxSize: 10, enableLRU: true });

    let callCount = 0;
    const fetcher = (key: number) => {
      callCount++;
      return delay(`data-${key}`, 5);
    };

    const resources = [];
    for (let i = 0; i < 5; i++) {
      const r = resource(fetcher, { key: () => i, cacheTime: 60000 });
      resources.push(r);
      r.request();
      await delay(20);
    }

    expect(callCount).toBe(5);

    for (let i = 0; i < 5; i++) {
      const r = resource(fetcher, { key: () => i, cacheTime: 60000 });
      r.get();
      await delay(20);
    }

    expect(callCount).toBe(5);
  });

  test("disables LRU eviction when configured", async () => {
    resourceCache.setConfig({ maxSize: 2, enableLRU: false });

    let callCount = 0;
    const fetcher = (key: number) => {
      callCount++;
      return delay(`data-${key}`, 5);
    };

    const r1 = resource(fetcher, { key: () => 1, cacheTime: 60000 });
    const r2 = resource(fetcher, { key: () => 2, cacheTime: 60000 });
    const r3 = resource(fetcher, { key: () => 3, cacheTime: 60000 });

    r1.request();
    await delay(20);
    r2.request();
    await delay(20);
    r3.request();
    await delay(20);

    expect(callCount).toBe(3);

    const r1Again = resource(fetcher, { key: () => 1, cacheTime: 60000 });
    r1Again.get();
    await delay(20);

    expect(callCount).toBe(3);
  });

  test("updates last access time on cache hits", async () => {
    resourceCache.setConfig({ maxSize: 2, enableLRU: true });

    let callCount = 0;
    const fetcher = (key: number) => {
      callCount++;
      return delay(`data-${key}`, 5);
    };

    const r1 = resource(fetcher, { key: () => 1, cacheTime: 60000 });
    const r2 = resource(fetcher, { key: () => 2, cacheTime: 60000 });

    r1.request();
    await delay(20);
    r2.request();
    await delay(20);

    r1.get();
    await delay(20);

    const r3 = resource(fetcher, { key: () => 3, cacheTime: 60000 });
    r3.request();
    await delay(20);

    const r1Again = resource(fetcher, { key: () => 1, cacheTime: 60000 });
    r1Again.get();
    await delay(20);

    expect(callCount).toBe(3);
    expect(r1Again.data()).toBe("data-1");

    const r2Again = resource(fetcher, { key: () => 2, cacheTime: 60000 });
    r2Again.get();
    await delay(20);

    expect(callCount).toBe(4);
  });
});