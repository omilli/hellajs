import { describe, it, expect } from "bun:test";
import { flushEffects, resource, signal } from "../lib/reactive";

function delay<T>(val: T, ms = 10): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(val), ms));
}

describe("resource", () => {
  it("fetches data and exposes it", async () => {
    const res = resource(() => delay("ok"));
    await delay(20);
    expect(res.data()).toBe("ok");
    expect(res.status()).toBe("success");
    expect(res.loading()).toBe(false);
    expect(res.error()).toBe(undefined);
  });

  it("handles errors", async () => {
    const res = resource(() => Promise.reject("fail"));
    await delay(10);
    expect(res.status()).toBe("error");
    expect(res.error()).toBe("fail");
    expect(res.loading()).toBe(false);
  });

  it("supports refetch", async () => {
    let n = 0;
    const res = resource(() => delay(++n));
    await delay(10);
    expect(res.data()).toBe(1);
    res.refetch();
    await delay(10);
    expect(res.data()).toBe(2);
  });

  it("supports reset", async () => {
    const res = resource(() => delay("foo"), { initialData: "bar" });
    await delay(10);
    expect(res.data()).toBe("foo");
    res.reset();
    await flushEffects()
    expect(res.data()).toBe("bar");
    expect(res.status()).toBe("idle");
  });

  it("supports invalidate", async () => {
    let n = 0;
    const keySig = signal(1);
    const res = resource(
      (k: number) => delay(++n),
      { key: () => keySig() }
    );
    await delay(10);
    expect(res.data()).toBe(1);
    res.invalidate();
    await delay(10);
    expect(res.data()).toBe(2);
  });

  it("supports abort", async () => {
    let aborted = false;
    const res = resource(() =>
      new Promise((_r, rej) => {
        setTimeout(() => {
          if (!aborted) _r("ok");
        }, 20);
      })
    );
    res.abort();
    await flushEffects();
    expect(res.status()).toBe("idle");
    expect(res.loading()).toBe(false);
  });

  it("supports mutate", async () => {
    const res = resource(() => delay("a"));
    await delay(10);
    await res.mutate(() => delay("b"));
    expect(res.data()).toBe("b");
    expect(res.status()).toBe("success");
  });

  it("respects enabled=false", async () => {
    let called = false;
    const res = resource(() => {
      called = true;
      return delay("x");
    }, { enabled: false });
    await delay(10);
    expect(called).toBe(false);
    expect(res.status()).toBe("idle");
  });

  it("calls onSuccess and onError", async () => {
    let ok: string | undefined, err: unknown;
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

  it("returns initialData immediately", () => {
    const res = resource(() => delay("foo"), { initialData: "bar" });
    expect(res.data()).toBe("bar");
  });

  it("status transitions correctly", async () => {
    const res = resource(() => delay("foo"));
    expect(res.status()).toBe("loading");
    await delay(1);
    expect(["loading", "success"]).toContain(res.status());
    await delay(20);
    expect(res.status()).toBe("success");
  });

  it("returns cached data if within cacheTime", async () => {
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
    keySig.set(1);
    await delay(10);
    expect(res.data()).toBe("cached");
    expect(callCount).toBe(1); // Should not call fetcher again due to cache
  });
});
