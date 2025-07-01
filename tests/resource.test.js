import { describe, test, expect } from "bun:test";
import { signal } from "../packages/core/dist/hella-core.esm";
import { resource } from "../packages/resource/dist/hella-resource.esm";
import { tick } from "./tick.js";

function delay(val, ms = 10) {
  return new Promise((resolve) => setTimeout(() => resolve(val), ms));
}

describe("resource", () => {
  test("fetches data and exposes test", async () => {
    const res = resource(() => delay("ok"));
    res.request();
    await delay(20);
    expect(res.data()).toBe("ok");
    expect(res.status()).toBe("success");
    expect(res.loading()).toBe(false);
    expect(res.error()).toBe(undefined);
  });

  test("handles errors", async () => {
    const res = resource(() => Promise.reject("fail"));
    res.request();
    await delay(10);
    expect(res.status()).toBe("error");
    expect(res.error()).toBe("fail");
    expect(res.loading()).toBe(false);
  });

  test("supports refetch", async () => {
    let n = 0;
    const res = resource(() => delay(++n));
    res.request();
    await delay(10);
    expect(res.data()).toBe(1);
    res.request();
    await delay(10);
    expect(res.data()).toBe(2);
  });

  test("supports abort", async () => {
    const res = resource(() => delay("foo"), { initialData: "bar" });
    res.request();
    await delay(10);
    expect(res.data()).toBe("foo");
    res.abort();
    await tick()
    expect(res.data()).toBe("bar");
    expect(res.status()).toBe("idle");
  });

  test("supports invalidate", async () => {
    let n = 0;
    const keySig = signal(1);
    const res = resource(
      (k) => delay(++n),
      { key: () => keySig() }
    );
    res.request();
    await delay(10);
    expect(res.data()).toBe(1);
    res.invalidate();
    await delay(10);
    expect(res.data()).toBe(2);
  });

  test("respects enabled=false", async () => {
    let called = false;
    const res = resource(() => {
      called = true;
      return delay("x");
    }, { enabled: false });
    await delay(10);
    expect(called).toBe(false);
    expect(res.status()).toBe("idle");
  });

  test("calls onSuccess and onError", async () => {
    let ok, err;
    const res1 = resource(() => delay("ok"), {
      onSuccess: (d) => { ok = d; }
    });
    res1.request();
    await delay(10);
    expect(ok).toBe("ok");

    const res2 = resource(() => Promise.reject("fail"), {
      onError: (e) => { err = e; }
    });
    res2.request();
    await delay(10);
    expect(err).toBe("fail");
  });

  test("returns initialData immediately", () => {
    const res = resource(() => delay("foo"), { initialData: "bar" });
    expect(res.data()).toBe("bar");
  });

  test("status transitions correctly", async () => {
    const res = resource(() => delay("foo"));
    res.request();
    expect(res.status()).toBe("loading");
    await delay(1);
    expect(["loading", "success"]).toContain(res.status());
    await delay(20);
    expect(res.status()).toBe("success");
  });

  test("returns cached data if within cacheTime", async () => {
    let callCount = 0;
    const keySig = signal(1);
    const res = resource(
      () => {
        callCount++;
        return delay("cached", 5);
      },
      { cacheTime: 100, key: () => keySig() }
    );
    res.request();
    await delay(10);
    expect(res.data()).toBe("cached");
    expect(callCount).toBe(1);
    // Trigger a re-fetch by changing the key to the same value (should hit cache)
    keySig(1);
    res.fetch(); // Use fetch() to hit cache
    await delay(10);
    expect(res.data()).toBe("cached");
    expect(callCount).toBe(1); // Should not call fetcher again due to cache
  });

  test("works with URL string instead of fetcher function", async () => {
    // Mock fetch for testing URL overload
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url) => ({
      json: async () => `data from ${url}`
    });

    try {
      const res = resource("https://api.example.com/data");
      res.request();
      await delay(10);
      expect(res.data()).toBe("data from https://api.example.com/data");
      expect(res.status()).toBe("success");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("does not cache when cacheTime is 0", async () => {
    let callCount = 0;
    const res = resource(
      () => {
        callCount++;
        return delay(`call-${callCount}`, 5);
      },
      { cacheTime: 0 } // No caching
    );
    res.request();
    await delay(10);
    expect(res.data()).toBe("call-1");

    // Refetch should call fetcher again since caching is disabled
    res.request();
    await delay(10);
    expect(res.data()).toBe("call-2");
    expect(callCount).toBe(2);
  });

  test("returns cached data immediately when cache is hit", async () => {
    let callCount = 0;
    const keySig = signal("test-key");
    const res = resource(
      (key) => {
        callCount++;
        return delay(`data-${callCount}-${key}`, 5);
      },
      { cacheTime: 1000, key: () => keySig() }
    );

    // First call
    res.request();
    await delay(10);
    expect(res.data()).toBe("data-1-test-key");
    expect(callCount).toBe(1);

    // Trigger effect by changing key to same value (should hit cache immediately)
    keySig("test-key");
    res.fetch(); // Use fetch() to hit cache
    // Should return cached data immediately without waiting
    expect(res.data()).toBe("data-1-test-key");
    await delay(10);
    expect(callCount).toBe(1); // Should not call fetcher again
  });

  test("abort prevents data update even if request resolves after abort", async () => {
    let resolveFn;
    const promise = new Promise((resolve) => { resolveFn = resolve; });
    const res = resource(() => promise, { initialData: "init" });
    res.request();
    res.abort();
    resolveFn("should not update");
    await tick();
    expect(res.data()).toBe("init");
    expect(res.status()).toBe("idle");
  });

  test("fetch or request after abort allows data to update again", async () => {
    let resolveFn;
    const promise = new Promise((resolve) => { resolveFn = resolve; });
    const res = resource(() => promise, { initialData: "init" });
    res.request();
    res.abort();
    resolveFn("should update now");
    await tick();
    expect(res.data()).toBe("init");
    res.request();
    await tick();
    expect(res.data()).toBe("should update now");
    expect(res.status()).toBe("success");
  });
});
