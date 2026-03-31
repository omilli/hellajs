import { describe, test, expect, beforeEach } from "bun:test";
import { resource, resourceCache } from "@hellajs/resource/bundle";

const delay = <T>(val: T, ms = 10): Promise<T> =>
  new Promise(r => setTimeout(() => r(val), ms));

// Poll until condition or timeout
const wait = (fn: () => boolean, ms = 500) =>
  new Promise<void>((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      if (fn()) return resolve();
      if (Date.now() - start > ms) return reject(new Error("timeout"));
      setTimeout(check, 10);
    };
    check();
  });

describe("retry", () => {
  beforeEach(() => resourceCache.map.clear());

  test("retries specified count", async () => {
    let n = 0;
    const r = resource(
      () => (++n < 3 ? Promise.reject(new Error("x")) : delay("ok")),
      { retry: 3, retryDelay: 10 }
    );
    r.request();
    await wait(() => r.status() === "success");
    expect(n).toBe(3);
    expect(r.data()).toBe("ok");
  });

  test("retry: true = 1 retry, false = 0", async () => {
    let n = 0;
    const r1 = resource(() => (++n, Promise.reject(new Error("x"))), { retry: true, retryDelay: 10 });
    r1.request();
    await wait(() => n >= 2);
    expect(n).toBe(2);

    n = 0;
    const r2 = resource(() => (++n, Promise.reject(new Error("x"))), { retry: false });
    r2.request();
    await delay(20);
    expect(n).toBe(1);
  });

  test("conditional retry based on error", async () => {
    let n = 0;
    const r = resource(
      () => (++n, Promise.reject(new Error("HTTP 404: x"))),
      { retry: (_, e) => e.category !== "not_found", retryDelay: 10 }
    );
    r.request();
    await delay(30);
    expect(n).toBe(1); // No retry for 404
    expect(r.error()?.category).toBe("not_found");
  });

  test("conditional retry for server errors", async () => {
    let n = 0;
    const r = resource(
      () => (++n, Promise.reject(new Error("HTTP 500: x"))),
      { retry: (c, e) => e.category === "server" && c < 3, retryDelay: 10 }
    );
    r.request();
    await wait(() => n >= 3);
    expect(n).toBe(3);
  });

  test("fixed and exponential delay", async () => {
    const ts: number[] = [];
    let n = 0;
    const r = resource(
      () => (ts.push(Date.now()), ++n < 3 ? Promise.reject(new Error("x")) : Promise.resolve("ok")),
      { retry: 2, retryDelay: 50 }
    );
    r.request();
    await wait(() => n >= 3);
    expect(ts[1]! - ts[0]!).toBeGreaterThanOrEqual(40);
    expect(ts[2]! - ts[1]!).toBeGreaterThanOrEqual(40);

    // Exponential
    const ts2: number[] = [];
    let n2 = 0;
    const r2 = resource(
      () => (ts2.push(Date.now()), ++n2, Promise.reject(new Error("x"))),
      { retry: 2, retryDelay: a => a * 30 }
    );
    r2.request();
    await wait(() => n2 >= 3);
    expect(ts2[1]! - ts2[0]!).toBeGreaterThanOrEqual(25);
    expect(ts2[2]! - ts2[1]!).toBeGreaterThanOrEqual(55);
  });

  test("abort during delay", async () => {
    let n = 0;
    const r = resource(() => (++n, Promise.reject(new Error("x"))), { retry: 10, retryDelay: 1000 });
    r.request();
    await delay(10);
    r.abort();
    await delay(20);
    expect(n).toBe(1);
    expect(r.status()).toBe("idle");
  });

  test("no retry on success", async () => {
    let n = 0;
    const r = resource(() => (++n, delay("ok")), { retry: 3, retryDelay: 10 });
    r.request();
    await wait(() => r.status() === "success");
    expect(n).toBe(1);
  });

  test("retryDelay receives error", async () => {
    let err: any = null;
    let n = 0;
    const r = resource(
      () => (++n, Promise.reject(new Error("HTTP 503: x"))),
      { retry: 1, retryDelay: (_, e) => (err = e, 10) }
    );
    r.request();
    await wait(() => n >= 2);
    expect(err?.category).toBe("server");
    expect(err?.statusCode).toBe(503);
  });

  test("retry count resets between requests", async () => {
    let n = 0, fail = true;
    const r = resource(
      () => (n++ === 0 && fail ? Promise.reject(new Error("x")) : delay("ok")),
      { retry: 3, retryDelay: 10 }
    );
    r.request();
    await wait(() => !r.isFetching());
    expect(n).toBe(2);

    n = 0; fail = true;
    r.request();
    await wait(() => !r.isFetching());
    expect(n).toBe(2);
  });

  test("works with cache", async () => {
    let n = 0;
    const r = resource(
      () => (++n < 2 ? Promise.reject(new Error("x")) : delay("ok")),
      { retry: 3, retryDelay: 10, cacheTime: 1000, key: () => "k" }
    );
    r.request();
    await wait(() => r.status() === "success");
    expect(n).toBe(2);
    r.get();
    await delay(20);
    expect(n).toBe(2); // Cache hit
  });

  test("respects enabled: false", async () => {
    let n = 0;
    const r = resource(() => (++n, Promise.reject(new Error("x"))), { retry: 3, enabled: false });
    r.request();
    await delay(20);
    expect(n).toBe(0);
  });
});
