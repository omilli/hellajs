import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { resource } from "../";

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
      abortSignal: controller.signal,
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

  test("reset returns resource to initial state", async () => {
    const r = resource(() => delay(mockUser), { initialData: {} as typeof mockUser });
    r.request();
    await delay(20);
    expect(r.data()).toEqual(mockUser);
    expect(r.status()).toBe("success");

    r.reset();

    expect(r.data()).toEqual({} as typeof mockUser);
    expect(r.status()).toBe("idle");
    expect(r.error()).toBe(undefined as any);
  });

  test("auto-fetch disabled by default", async () => {
    const userId = signal(1);
    let fetcherCalled = false;

    const r = resource(
      (id) => {
        fetcherCalled = true;
        return delay({ id, name: `User ${id}` });
      },
      { key: () => userId() }
    );

    let cleanup = effect(() => r.data());
    await delay(20);

    expect(fetcherCalled).toBe(false);
    expect(r.status()).toBe("idle");
    cleanup?.();
  });

  test("auto-fetch triggers on key change", async () => {
    const userId = signal(1);
    let fetchCount = 0;

    const r = resource(
      (id) => {
        fetchCount++;
        return delay({ id, name: `User ${id}` });
      },
      {
        key: () => userId(),
        auto: true
      }
    );

    let cleanup = effect(() => r.status());

    // Initial auto-fetch
    await delay(20);
    expect(fetchCount).toBe(1);
    expect(r.data()?.name).toBe("User 1");

    // Change key triggers auto-fetch
    userId(2);
    await delay(20);
    expect(fetchCount).toBe(2);
    expect(r.data()?.name).toBe("User 2");

    cleanup?.();
  });

  test("auto-fetch respects enabled flag", async () => {
    const userId = signal(1);
    let fetchCount = 0;

    const r = resource(
      (id) => {
        fetchCount++;
        return delay({ id, name: `User ${id}` });
      },
      {
        key: () => userId(),
        auto: true,
        enabled: false
      }
    );

    let cleanup = effect(() => r.status());
    await delay(20);

    expect(fetchCount).toBe(0);
    expect(r.status()).toBe("idle");
    cleanup?.();
  });

  test("accepts static key value", async () => {
    const r = resource(
      (key) => delay({ key, data: `Data for ${key}` }),
      { key: () => "static-key", cacheTime: 100 }
    );

    r.request();
    await delay(20);

    expect(r.data()).toEqual({ key: "static-key", data: "Data for static-key" });
    expect(r.cacheKey()).toBe("static-key");
  });
});