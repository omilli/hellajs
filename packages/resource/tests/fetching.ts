import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import { resource } from "@hellajs/resource/bundle";

const mockUser = { id: 1, name: "John Doe" };
const mockPosts = [{ id: 1, title: "Post 1" }, { id: 2, title: "Post 2" }];

describe("resource", () => {
  describe("fetching", () => {
    let originalFetch: typeof globalThis.fetch;

    beforeEach(() => {
      originalFetch = globalThis.fetch;
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    test("fetches data successfully", async () => {
      const r = resource(() => delay(mockUser));
      r.fetch({ force: true });
      expect(r.isLoading()).toBe(true);
      await delay(20);
      expect(r.data()).toEqual(mockUser);
      expect(r.status()).toBe("success");
      expect(r.isLoading()).toBe(false);
      expect(r.error()).toBeUndefined();
    });

    test("refetches data", async () => {
      let page = 1;
      const r = resource(() => delay(`Page ${page}`));
      r.fetch({ force: true });
      await delay(20);
      expect(r.data()).toBe("Page 1");
      page = 2;
      r.fetch({ force: true });
      await delay(20);
      expect(r.data()).toBe("Page 2");
    });

    test("invalidates on key change", async () => {
      const userId = signal(1);
      const r = resource(
        (id) => delay({ id, name: `User ${id}` }),
        { key: () => userId() }
      );
      r.fetch({ force: true });
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
      r.fetch({ force: true });
      await delay(20);
      expect(fetcherCalled).toBe(false);
      expect(r.status()).toBe("idle");
    });

    test("calls onSuccess callback", async () => {
      let successData: undefined | typeof mockUser
      const successR = resource(() => delay(mockUser), {
        onSuccess: (data) => { successData = data }
      })
      successR.fetch({ force: true })
      await delay(20)
      expect(successData).toEqual(mockUser)
    })

    test("calls onError callback", async () => {
      let errorData: undefined | string
      const errorR = resource(() => Promise.reject("Error"), {
        onError: (err) => { errorData = err as string }
      })
      errorR.fetch({ force: true })
      await delay(20)
      expect(errorData).toBe("Error")
    })

    test("shows initial data", () => {
      const r = resource(() => delay(mockPosts), { initialData: [] });
      expect(r.data()).toEqual([]);
    });

    test("transitions status correctly", async () => {
      const r = resource(() => delay("ok"));
      r.fetch({ force: true });
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
      r.fetch({ force: true });
      await delay(20);
      expect(r.data()).toEqual({ message: "Data from https://api.example.com/data" });
      expect(r.status()).toBe("success");
    });

    test("timeout does not interfere with fast response", async () => {
      const r = resource(() => delay("response", 10), {
        timeout: 1000,
        initialData: "initial"
      });

      r.fetch({ force: true });
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

      r.fetch({ force: true });
      // Has initialData, so isLoading=false but isFetching=true
      expect(r.isLoading()).toBe(false);
      expect(r.isFetching()).toBe(true);

      controller.abort();
      await delay(10);

      expect(r.data()).toBe("initial");
      expect(r.isLoading()).toBe(false);
      expect(r.status()).toBe("idle");

      resolvePromise("late response");
      await delay(10);
      expect(r.data()).toBe("initial");
    });

    test("reset returns resource to initial state", async () => {
      const r = resource(() => delay(mockUser), { initialData: {} as typeof mockUser });
      r.fetch({ force: true });
      await delay(20);
      expect(r.data()).toEqual(mockUser);
      expect(r.status()).toBe("success");

      r.reset();

      expect(r.data()).toEqual({} as typeof mockUser);
      expect(r.status()).toBe("idle");
      expect(r.error()).toBeUndefined();
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

      const cleanup = effect(() => r.data());
      await delay(20);

      expect(fetcherCalled).toBe(false);
      expect(r.status()).toBe("idle");
      cleanup?.();
    });

    test("auto-fetch triggers on key change", async () => {
      const userId = signal(1);

      const fetcher = mock((id: number) => delay({ id, name: `User ${id}` }));
      const r = resource(fetcher, {
        key: () => userId(),
        refetchOnKeyChange: true
      });

      const cleanup = effect(() => r.status());

      // Initial auto-fetch
      await delay(20);
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(r.data()?.name).toBe("User 1");

      // Change key triggers auto-fetch
      userId(2);
      await delay(20);
      expect(fetcher).toHaveBeenCalledTimes(2);
      expect(r.data()?.name).toBe("User 2");

      cleanup?.();
    });

    test("auto-fetch respects enabled flag", async () => {
      const userId = signal(1);

      const fetcher = mock((id: number) => delay({ id, name: `User ${id}` }));
      const r = resource(fetcher, {
        key: () => userId(),
        refetchOnKeyChange: true,
        enabled: false
      });

      const cleanup = effect(() => r.status());
      await delay(20);

      expect(fetcher).toHaveBeenCalledTimes(0);
      expect(r.status()).toBe("idle");
      cleanup?.();
    });

    test("accepts static key value", async () => {
      const r = resource(
        (key) => delay({ key, data: `Data for ${key}` }),
        { key: () => "static-key", cacheTime: 100 }
      );

      r.fetch({ force: true });
      await delay(20);

      expect(r.data()).toEqual({ key: "static-key", data: "Data for static-key" });
      expect(r.cacheKey()).toBe("static-key");
    });

    test("skips fetch when key is undefined or null", async () => {
      const userId = signal<number | undefined>(undefined);

      const fetcher = mock((id: number | undefined) => delay({ id, name: `User ${id}` }));
      const r = resource(fetcher, {
        key: () => userId(),
        refetchOnKeyChange: true
      });

      const cleanup = effect(() => r.status());
      await delay(20);

      // No fetch with undefined key
      expect(fetcher).toHaveBeenCalledTimes(0);
      expect(r.status()).toBe("idle");

      // Still no fetch with null key
      userId(null as unknown as number);
      await delay(20);
      expect(fetcher).toHaveBeenCalledTimes(0);
      expect(r.status()).toBe("idle");

      // Fetches once key has a real value
      userId(1);
      await delay(20);
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(r.data()?.name).toBe("User 1");

      cleanup?.();
    });

    test("dispose during ongoing request", async () => {
      let resolvePromise: (value: string) => void = () => { };
      const promise = new Promise<string>((resolve) => { resolvePromise = resolve; });

      const r = resource(() => promise, {
        initialData: "initial",
        refetchOnKeyChange: true,
        refetchInterval: 20,
      });

      effect(() => r.status());

      r.fetch({ force: true });
      expect(r.isFetching()).toBe(true);

      // dispose cleans up effects and timers but does NOT abort
      r.dispose();

      // Resolve the promise: signal still updates since dispose doesn't cancel
      resolvePromise("resolved");
      await delay(20);

      expect(r.data()).toBe("resolved");
      expect(r.status()).toBe("success");
    });
  });
});