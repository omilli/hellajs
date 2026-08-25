import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import { delay, resetTestState } from "@utils/test-helpers.js";
import { resource, resourceCache } from "@hellajs/resource/bundle";

describe("resourceCache", () => {
  describe("prefetch", () => {
    let originalFetch: typeof globalThis.fetch;

    beforeEach(() => {
      resetTestState();
      originalFetch = globalThis.fetch;
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    test("prefetched entries are reused by a resource sharing the fetcher reference", async () => {
      const fetcher = mock(async (id: number) => ({ id, name: "John" }));
      await resourceCache.prefetch({ fetcher, key: 1, cacheTime: 60000 });

      const r = resource(fetcher, { key: 1, cacheTime: 60000 });
      r.fetch();
      await delay(10);

      expect(r.data()).toEqual({ id: 1, name: "John" });
      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    test("URL overload cannot share a prefetched entry", async () => {
      const fetchMock = mock(async (url: string) => ({
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => ({ from: "network", url }),
      }));
      globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

      const namedFetcher = mock(async () => ({ from: "prefetch" }));
      await resourceCache.prefetch({ fetcher: namedFetcher, key: "/api/x", cacheTime: 60000 });

      const r = resource("/api/x", { cacheTime: 60000, refetchOnKeyChange: true });
      await delay(10);

      expect(r.data()).toEqual({ from: "network", url: "/api/x" });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    test("concurrent prefetch calls with the same fetcher and key share one request", async () => {
      const fetcher = mock(async (id: number) => {
        await delay(10);
        return { id };
      });

      const [a, b] = await Promise.all([
        resourceCache.prefetch({ fetcher, key: 1, cacheTime: 60000 }),
        resourceCache.prefetch({ fetcher, key: 1, cacheTime: 60000 }),
      ]);

      expect(a).toEqual({ id: 1 });
      expect(b).toEqual({ id: 1 });
      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    test("retries on failure and aborts on signal", async () => {
      const retryingFetcher = mock(async (id: number) => {
        if (retryingFetcher.mock.calls.length === 1) throw new Error("transient");
        return { id };
      });
      const retried = await resourceCache.prefetch({
        fetcher: retryingFetcher,
        key: 1,
        retry: 2,
        retryDelay: 1,
      });
      expect(retried).toEqual({ id: 1 });
      expect(retryingFetcher).toHaveBeenCalledTimes(2);

      const controller = new AbortController();
      const hangingFetcher = mock(() => new Promise<{ done: boolean }>(() => {}));
      const hanging = resourceCache.prefetch({
        fetcher: hangingFetcher,
        key: 2,
        abortSignal: controller.signal,
      });
      await delay(1);
      controller.abort();
      try {
        await hanging;
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(DOMException);
        expect((err as DOMException).name).toBe("AbortError");
      }
    });

    test("rejects invalid options and non-function fetcher", () => {
      // @ts-expect-error intentionally invalid options
      expect(() => resourceCache.prefetch(null)).toThrow("[resource] prefetch: options");
      // @ts-expect-error fetcher must be a function
      expect(() => resourceCache.prefetch({ fetcher: "nope", key: 1 })).toThrow("[resource] prefetch: fetcher");
    });

    test("aborts via timeout", async () => {
      const fetcher = mock(() => new Promise<{ done: boolean }>(() => {}));
      const p = resourceCache.prefetch({ fetcher, key: 1, timeout: 10 });
      try {
        await p;
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(DOMException);
        expect((err as DOMException).name).toBe("AbortError");
      }
    });

    test("aborts immediately with a pre-aborted signal", async () => {
      const controller = new AbortController();
      controller.abort();
      const fetcher = mock(async (id: number) => ({ id }));
      try {
        await resourceCache.prefetch({ fetcher, key: 1, abortSignal: controller.signal });
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(DOMException);
        expect((err as DOMException).name).toBe("AbortError");
      }
    });

    test("rejects when retries are exhausted", async () => {
      const fetcher = mock(async () => { throw new Error("always fails"); });
      try {
        await resourceCache.prefetch({ fetcher, key: 1, retry: 1, retryDelay: 1 });
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(Error);
        expect((err as Error).message).toBe("always fails");
      }
    });

    test("aborts during a retry delay", async () => {
      const controller = new AbortController();
      const fetcher = mock(async () => { throw new Error("fail"); });
      const p = resourceCache.prefetch({
        fetcher,
        key: 1,
        retry: 3,
        retryDelay: 50,
        abortSignal: controller.signal,
      });
      await delay(5);
      controller.abort();
      try {
        await p;
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(DOMException);
        expect((err as DOMException).name).toBe("AbortError");
      }
    });

    test("external-signal listeners are released when prefetch settles", async () => {
      const listenerCounts = { added: 0, removed: 0 };
      const fakeSignal = {
        aborted: false,
        addEventListener: () => { listenerCounts.added++; },
        removeEventListener: () => { listenerCounts.removed++; },
      } as unknown as AbortSignal;

      const fetcher = async (key: number) => `user-${key}`;

      await resourceCache.prefetch({ fetcher, key: 1, cacheTime: 60000, abortSignal: fakeSignal });
      await resourceCache.prefetch({ fetcher, key: 2, cacheTime: 60000, abortSignal: fakeSignal });
      await resourceCache.prefetch({ fetcher, key: 3, cacheTime: 60000, abortSignal: fakeSignal });

      expect(listenerCounts.added).toBe(3);
      expect(listenerCounts.removed).toBe(3);
    });
  });
});
