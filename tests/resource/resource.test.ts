import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { signal, flush } from "@hellajs/core";
import { resource, resourceCacheConfig } from "../../packages/resource";

const delay = <T>(val: T, ms: number = 10): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(val), ms));

const mockUser = { id: 1, name: "John Doe" };
const mockPosts = [{ id: 1, title: "Post 1" }, { id: 2, title: "Post 2" }];

describe("resource", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("fetches data successfully", async () => {
    const r = resource(() => delay(mockUser));
    r.request();
    expect(r.loading()).toBe(true);
    await delay(20);
    expect(r.data()).toEqual(mockUser);
    expect(r.status()).toBe("success");
    expect(r.loading()).toBe(false);
    expect(r.error()).toBe(undefined as any);
  });

  test("handles errors", async () => {
    const r = resource(() => Promise.reject("API Error"));
    r.request();
    expect(r.loading()).toBe(true);
    await delay(20);
    expect(r.status()).toBe("error");
    expect(r.error()?.message).toBe("API Error");
    expect(r.error()?.category).toBe("unknown");
    expect(r.loading()).toBe(false);
  });

  test("refetches data", async () => {
    let page = 1;
    const r = resource(() => delay(`Page ${page}`));
    r.request();
    await delay(20);
    expect(r.data()).toBe("Page 1");
    page = 2;
    r.request();
    await delay(20);
    expect(r.data()).toBe("Page 2");
  });

  test("aborts request", async () => {
    const r = resource(() => delay({ theme: "dark" }), { initialData: { theme: "light" } });
    r.request();
    await delay(1);
    r.abort();
    flush();
    expect(r.data()?.theme).toBe("light");
    expect(r.status()).toBe("idle");
  });

  test("invalidates on key change", async () => {
    const userId = signal(1);
    const r = resource(
      (id) => delay({ id, name: `User ${id}` }),
      { key: () => userId() }
    );
    r.request();
    await delay(20);
    expect(r.data()?.name).toBe("User 1");
    userId(2);
    r.invalidate();
    await delay(20);
    expect(r.data()?.name).toBe("User 2");
  });

  test("respects enabled flag", async () => {
    let fetcherCalled = false;
    const r = resource(() => {
      fetcherCalled = true;
      return delay(mockUser);
    }, { enabled: false });
    r.request();
    await delay(20);
    expect(fetcherCalled).toBe(false);
    expect(r.status()).toBe("idle");
  });

  test("calls callbacks", async () => {
    let successData: undefined | typeof mockUser, errorData: undefined | string;
    const successR = resource(() => delay(mockUser), {
      onSuccess: (data) => { successData = data; }
    });
    successR.request();
    await delay(20);
    expect(successData).toEqual(mockUser);

    const errorR = resource(() => Promise.reject("Error"), {
      onError: (err) => { errorData = err as string; }
    });
    errorR.request();
    await delay(20);
    expect(errorData).toBe("Error");
  });

  test("shows initial data", () => {
    const r = resource(() => delay(mockPosts), { initialData: [] });
    expect(r.data()).toEqual([]);
  });

  test("transitions status correctly", async () => {
    const r = resource(() => delay("ok"));
    r.request();
    expect(r.status()).toBe("loading");
    await delay(20);
    expect(r.status()).toBe("success");
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
    r.fetch();
    expect(r.data()).toEqual(mockUser);
    expect(callCount).toBe(1);
  });

  test("fetches from URL", async () => {
    globalThis.fetch = (async (url: RequestInfo) => ({
      ok: true,
      json: async () => ({ message: `Data from ${url}` })
    })) as unknown as typeof globalThis.fetch;

    const r = resource("https://api.example.com/data");
    r.request();
    await delay(20);
    expect(r.data()).toEqual({ message: "Data from https://api.example.com/data" });
    expect(r.status()).toBe("success");
  });

  test("handles HTTP errors from URL", async () => {
    globalThis.fetch = (async () => ({
      ok: false,
      status: 404,
      statusText: "Not Found"
    })) as unknown as typeof globalThis.fetch;

    const r = resource("https://api.example.com/notfound");
    r.request();
    await delay(20);
    expect(r.status()).toBe("error");
    expect(r.error()?.message).toBe("HTTP 404: Not Found");
    expect(r.error()?.category).toBe("not_found");
    expect(r.error()?.statusCode).toBe(404);
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
    const key = signal("user-1");
    const r = resource(
      (k) => {
        callCount++;
        return delay({ key: k, data: `Data for ${k}` }, 5);
      },
      { cacheTime: 1000, key: () => key() }
    );

    r.request();
    await delay(20);
    expect(r.data()?.data).toBe("Data for user-1");
    expect(callCount).toBe(1);

    key("user-1");
    r.fetch();
    expect(r.data()?.data).toBe("Data for user-1");
    await delay(20);
    expect(callCount).toBe(1);
  });

  test("cleans up expired cache entries", async () => {
    let callCount = 0;
    const r = resource(
      () => {
        callCount++;
        return delay(`Call ${callCount}`, 5);
      },
      { cacheTime: 15 }
    );

    r.request();
    await delay(20);
    expect(r.data()).toBe("Call 1");
    expect(callCount).toBe(1);

    await delay(20);

    r.fetch();
    await delay(20);
    expect(r.data()).toBe("Call 2");
    expect(callCount).toBe(2);
  });

  test("ignores late responses after abort", async () => {
    let resolvePromise: (value: unknown) => void = () => { };
    const promise = new Promise((resolve) => { resolvePromise = resolve; });
    const r = resource(() => promise, { initialData: "initial" });
    r.request();
    r.abort();
    resolvePromise("resolved");
    flush();
    expect(r.data()).toBe("initial");
    expect(r.status()).toBe("idle");
  });

  test("allows requests after abort", async () => {
    const r = resource(() => delay("new data"), { initialData: "initial" });
    r.request();
    r.abort();
    flush();
    expect(r.data()).toBe("initial");
    r.request();
    await delay(20);
    expect(r.data()).toBe("new data");
    expect(r.status()).toBe("success");
  });

  test("accepts timeout option", async () => {
    const r = resource(() => delay("response", 10), {
      timeout: 1000,
      initialData: "initial"
    });

    r.request();
    await delay(30);

    expect(r.data()).toBe("response");
    expect(r.status()).toBe("success");
  });

  test("handles external AbortSignal", async () => {
    const controller = new AbortController();
    let resolvePromise: (value: string) => void = () => { };
    const slowPromise = new Promise<string>((resolve) => { resolvePromise = resolve; });

    const r = resource(() => slowPromise, {
      signal: controller.signal,
      initialData: "initial"
    });

    r.request();
    expect(r.loading()).toBe(true);

    controller.abort();
    await delay(10);

    expect(r.data()).toBe("initial");
    expect(r.loading()).toBe(false);
    expect(r.status()).toBe("idle");

    resolvePromise("late response");
    await delay(10);
    expect(r.data()).toBe("initial");
  });

  describe("cache limits and LRU eviction", () => {
    beforeEach(() => {
      resourceCacheConfig({ maxSize: 1000, enableLRU: true });
    });

    test("should respect cache size limits with LRU eviction", async () => {
      resourceCacheConfig({ maxSize: 2, enableLRU: true });

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
      r1Again.fetch();
      await delay(20);

      expect(callCount).toBe(4);
    });

    test("should not evict when cache is under limit", async () => {
      resourceCacheConfig({ maxSize: 10, enableLRU: true });

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
        r.fetch();
        await delay(20);
      }

      expect(callCount).toBe(5);
    });

    test("should disable LRU eviction when configured", async () => {
      resourceCacheConfig({ maxSize: 2, enableLRU: false });

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
      r1Again.fetch();
      await delay(20);

      expect(callCount).toBe(3);
    });

    test("should update last access time on cache hits", async () => {
      resourceCacheConfig({ maxSize: 2, enableLRU: true });

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

      r1.fetch();
      await delay(20);

      const r3 = resource(fetcher, { key: () => 3, cacheTime: 60000 });
      r3.request();
      await delay(20);

      const r1Again = resource(fetcher, { key: () => 1, cacheTime: 60000 });
      r1Again.fetch();
      await delay(20);

      expect(callCount).toBe(3);
      expect(r1Again.data()).toBe("data-1");

      const r2Again = resource(fetcher, { key: () => 2, cacheTime: 60000 });
      r2Again.fetch();
      await delay(20);

      expect(callCount).toBe(4);
    });
  });

  test("handles AbortError from DOMException", async () => {
    const r = resource(() => Promise.reject(new DOMException("Request was aborted", "AbortError")), {
      initialData: "initial"
    });
    r.request();
    await delay(20);
    expect(r.status()).toBe("idle");
    expect(r.data()).toBe("initial");
    expect(r.loading()).toBe(false);
  });

  test("handles HTTP client error (4xx)", async () => {
    const r = resource(() => Promise.reject(new Error("HTTP 400: Bad Request")));
    r.request();
    await delay(20);
    expect(r.status()).toBe("error");
    expect(r.error()?.message).toBe("HTTP 400: Bad Request");
    expect(r.error()?.category).toBe("client");
    expect(r.error()?.statusCode).toBe(400);
    expect(r.error()?.originalError).toBeInstanceOf(Error);
  });

  test("handles HTTP server error (5xx)", async () => {
    const r = resource(() => Promise.reject(new Error("HTTP 500: Internal Server Error")));
    r.request();
    await delay(20);
    expect(r.status()).toBe("error");
    expect(r.error()?.message).toBe("HTTP 500: Internal Server Error");
    expect(r.error()?.category).toBe("server");
    expect(r.error()?.statusCode).toBe(500);
    expect(r.error()?.originalError).toBeInstanceOf(Error);
  });

  test("handles HTTP error with status but not classified (3xx)", async () => {
    const r = resource(() => Promise.reject(new Error("HTTP 300: Multiple Choices")));
    r.request();
    await delay(20);
    expect(r.status()).toBe("error");
    expect(r.error()?.message).toBe("HTTP 300: Multiple Choices");
    expect(r.error()?.category).toBe("unknown");
    expect(r.error()?.originalError).toBeInstanceOf(Error);
  });

  test("handles external AbortSignal already aborted", async () => {
    const controller = new AbortController();
    controller.abort();

    const r = resource(() => delay("response", 10), {
      signal: controller.signal,
      initialData: "initial"
    });

    r.request();
    await delay(20);

    expect(r.data()).toBe("initial");
    expect(r.loading()).toBe(false);
    expect(r.status()).toBe("idle");
  });

  test("handles timeout abort", async () => {
    const r = resource(() => delay("response", 50), {
      timeout: 10,
      initialData: "initial"
    });

    r.request();
    expect(r.loading()).toBe(true);

    await delay(20);

    expect(r.data()).toBe("initial");
    expect(r.loading()).toBe(false);
    expect(r.status()).toBe("idle");
  });

  test("handles race condition with immediate abort after request", async () => {
    let fetcherStarted = false;
    const r = resource(async () => {
      fetcherStarted = true;
      return delay("response", 100);
    }, { initialData: "initial" });

    r.request();
    expect(r.loading()).toBe(true);

    r.abort();
    await delay(1);

    expect(r.data()).toBe("initial");
    expect(r.loading()).toBe(false);
    expect(r.status()).toBe("idle");
  });
});
