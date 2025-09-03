import { describe, test, expect, beforeEach, afterEach, type Mock } from "bun:test";
import { signal } from "../../packages/core";
import { resource } from "../../packages/resource";
import { tick } from "../utils/tick.js";

// Mock API delay
function delay<T>(val: T, ms: number = 10): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(val), ms));
}

// Mock user data
interface MockUser {
  id: number;
  name: string;
}

interface MockPost {
  id: number;
  title: string;
}

const mockUser: MockUser = { id: 1, name: "John Doe" };
const mockPosts: MockPost[] = [{ id: 1, title: "Post 1" }, { id: 2, title: "Post 2" }];

describe("resource", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("fetch user data and reflect success state", async () => {
    const userResource = resource(() => delay(mockUser));
    userResource.request();
    expect(userResource.loading()).toBe(true);
    await delay(20);
    expect(userResource.data()).toEqual(mockUser);
    expect(userResource.status()).toBe("success");
    expect(userResource.loading()).toBe(false);
    expect(userResource.error()).toBe(undefined);
  });

  test("handle API errors gracefully", async () => {
    const errorResource = resource(() => Promise.reject("API Error"));
    errorResource.request();
    expect(errorResource.loading()).toBe(true);
    await delay(20);
    expect(errorResource.status()).toBe("error");
    expect(errorResource.error()).toBe("API Error");
    expect(errorResource.loading()).toBe(false);
  });

  test("refetch user posts", async () => {
    let page = 1;
    const postsResource = resource(() => delay(`Page ${page}`));
    postsResource.request();
    await delay(20);
    expect(postsResource.data()).toBe("Page 1");
    page = 2;
    postsResource.request();
    await delay(20);
    expect(postsResource.data()).toBe("Page 2");
  });

  test("abort a pending request and revert to initial data", async () => {
    const settingsResource = resource(() => delay({ theme: "dark" }), { initialData: { theme: "light" } });
    settingsResource.request();
    await delay(1); // let request start
    settingsResource.abort();
    await tick();
    expect(settingsResource.data()?.theme).toBe("light");
    expect(settingsResource.status()).toBe("idle");
  });

  test("invalidate and refetch data when a key changes", async () => {
    const userId = signal(1);
    const userResource = resource(
      (id) => delay({ id, name: `User ${id}` }),
      { key: () => userId() }
    );
    userResource.request();
    await delay(20);
    expect(userResource.data()?.name).toBe("User 1");
    userId(2); // Change the key
    userResource.invalidate();
    await delay(20);
    expect(userResource.data()?.name).toBe("User 2");
  });

  test("not fetch data if disabled", async () => {
    let fetcherCalled = false;
    const userResource = resource(() => {
      fetcherCalled = true;
      return delay(mockUser);
    }, { enabled: false });
    userResource.request();
    await delay(20);
    expect(fetcherCalled).toBe(false);
    expect(userResource.status()).toBe("idle");
  });

  test("call onSuccess and onError callbacks", async () => {
    let successData: undefined | MockUser, errorData: undefined | string;
    const successResource = resource(() => delay(mockUser), {
      onSuccess: (data) => { successData = data; }
    });
    successResource.request();
    await delay(20);
    expect(successData).toEqual(mockUser);

    const errorResource = resource(() => Promise.reject("Error"), {
      onError: (err) => { errorData = err as string; }
    });
    errorResource.request();
    await delay(20);
    expect(errorData).toBe("Error");
  });

  test("show initial data while fetching", () => {
    const resourceWithInitialData = resource(() => delay(mockPosts), { initialData: [] });
    expect(resourceWithInitialData.data()).toEqual([]);
  });

  test("transition through loading, and success statuses", async () => {
    const statusResource = resource(() => delay("ok"));
    statusResource.request();
    expect(statusResource.status()).toBe("loading");
    await delay(20);
    expect(statusResource.status()).toBe("success");
  });

  test("serve cached data within cacheTime", async () => {
    let callCount = 0;
    const cachedResource = resource(
      () => {
        callCount++;
        return delay(mockUser, 5);
      },
      { cacheTime: 100 }
    );
    cachedResource.request();
    await delay(20);
    expect(cachedResource.data()).toEqual(mockUser);
    expect(callCount).toBe(1);
    // This should be a cache hit
    cachedResource.fetch(); // Use fetch() to hit cache, not request()
    expect(cachedResource.data()).toEqual(mockUser);
    expect(callCount).toBe(1);
  });

  test("fetch from a URL string", async () => {
    interface MockFetchJson {
      message: string;
    }

    interface MockFetchResponse {
      json: () => Promise<MockFetchJson>;
    }

    globalThis.fetch = (async (url: RequestInfo): Promise<MockFetchResponse> => ({
      json: async (): Promise<MockFetchJson> => ({ message: `Data from ${url}` })
    })) as unknown as typeof globalThis.fetch;

    const urlResource = resource("https://api.example.com/data");
    urlResource.request();
    await delay(20);
    expect(urlResource.data()).toEqual({ message: "Data from https://api.example.com/data" });
    expect(urlResource.status()).toBe("success");
  });

  test("not cache data when cacheTime is 0", async () => {
    let callCount = 0;
    const noCacheResource = resource(
      () => {
        callCount++;
        return delay(`Call ${callCount}`, 5);
      },
      { cacheTime: 0 }
    );
    noCacheResource.request();
    await delay(20);
    expect(noCacheResource.data()).toBe("Call 1");
    noCacheResource.request();
    await delay(20);
    expect(noCacheResource.data()).toBe("Call 2");
    expect(callCount).toBe(2);
  });

  test("return cached data immediately on cache hit", async () => {
    let callCount = 0;
    const key = signal("user-1");
    const immediateCacheResource = resource(
      (k) => {
        callCount++;
        return delay({ key: k, data: `Data for ${k}` }, 5);
      },
      { cacheTime: 1000, key: () => key() }
    );

    immediateCacheResource.request();
    await delay(20);
    expect(immediateCacheResource.data()?.data).toBe("Data for user-1");
    expect(callCount).toBe(1);

    // Should hit cache immediately
    key("user-1");
    immediateCacheResource.fetch();
    expect(immediateCacheResource.data()?.data).toBe("Data for user-1");
    await delay(20);
    expect(callCount).toBe(1);
  });

  test("not update data if request resolves after abort", async () => {
    let resolvePromise: (value: unknown) => void = () => { };
    const promise = new Promise((resolve) => { resolvePromise = resolve; });
    const abortResource = resource(() => promise, { initialData: "initial" });
    abortResource.request();
    abortResource.abort();
    resolvePromise("resolved");
    await tick();
    expect(abortResource.data()).toBe("initial");
    expect(abortResource.status()).toBe("idle");
  });

  test("allows new requests after an abort", async () => {
    const abortAndRefetchResource = resource(() => delay("new data"), { initialData: "initial" });
    abortAndRefetchResource.request();
    abortAndRefetchResource.abort();
    await tick();
    expect(abortAndRefetchResource.data()).toBe("initial");
    abortAndRefetchResource.request();
    await delay(20);
    expect(abortAndRefetchResource.data()).toBe("new data");
    expect(abortAndRefetchResource.status()).toBe("success");
  });
});
