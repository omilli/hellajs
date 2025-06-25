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
    await delay(20);
    expect(res.data()).toBe("ok");
    expect(res.status()).toBe("success");
    expect(res.loading()).toBe(false);
    expect(res.error()).toBe(undefined);
  });

  test("handles errors", async () => {
    const res = resource(() => Promise.reject("fail"));
    await delay(10);
    expect(res.status()).toBe("error");
    expect(res.error()).toBe("fail");
    expect(res.loading()).toBe(false);
  });

  test("supports refetch", async () => {
    let n = 0;
    const res = resource(() => delay(++n));
    await delay(10);
    expect(res.data()).toBe(1);
    res.refetch();
    await delay(10);
    expect(res.data()).toBe(2);
  });

  test("supports reset", async () => {
    const res = resource(() => delay("foo"), { initialData: "bar" });
    await delay(10);
    expect(res.data()).toBe("foo");
    res.reset();
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
    await delay(10);
    expect(res.data()).toBe(1);
    res.invalidate();
    await delay(10);
    expect(res.data()).toBe(2);
  });

  test("supports mutate", async () => {
    const res = resource(() => delay("a"));
    await delay(10);
    await res.mutate(() => delay("b"));
    expect(res.data()).toBe("b");
    expect(res.status()).toBe("success");
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
    await delay(10);
    expect(ok).toBe("ok");

    const res2 = resource(() => Promise.reject("fail"), {
      onError: (e) => { err = e; }
    });
    await delay(10);
    expect(err).toBe("fail");
  });

  test("returns initialData immediately", () => {
    const res = resource(() => delay("foo"), { initialData: "bar" });
    expect(res.data()).toBe("bar");
  });

  test("status transitions correctly", async () => {
    const res = resource(() => delay("foo"));
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
    await delay(10);
    expect(res.data()).toBe("cached");
    expect(callCount).toBe(1);
    // Trigger a re-fetch by changing the key to the same value (should hit cache)
    keySig(1);
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
    await delay(10);
    expect(res.data()).toBe("call-1");

    // Refetch should call fetcher again since caching is disabled
    res.refetch();
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
    await delay(10);
    expect(res.data()).toBe("data-1-test-key");
    expect(callCount).toBe(1);

    // Trigger effect by changing key to same value (should hit cache immediately)
    keySig("test-key");
    // Should return cached data immediately without waiting
    expect(res.data()).toBe("data-1-test-key");
    await delay(10);
    expect(callCount).toBe(1); // Should not call fetcher again
  });

  test("handles errors in mutate function", async () => {
    const res = resource(() => delay("initial"));
    await delay(10);
    expect(res.data()).toBe("initial");

    // Mutate with error
    await res.mutate(() => Promise.reject("mutate error"));
    expect(res.error()).toBe("mutate error");
    expect(res.status()).toBe("error");
    expect(res.loading()).toBe(false);
  });

  test("calls onSuccess and onError in mutate", async () => {
    let successData, errorData;
    const res = resource(() => delay("initial"), {
      onSuccess: (data) => { successData = data; },
      onError: (err) => { errorData = err; }
    });
    await delay(10);

    // Successful mutate
    await res.mutate(() => delay("mutated"));
    expect(successData).toBe("mutated");

    // Error mutate
    await res.mutate(() => Promise.reject("mutate fail"));
    expect(errorData).toBe("mutate fail");
  });
});
