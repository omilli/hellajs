import { describe, expect, test, mock, beforeEach, afterEach } from "bun:test";
import { resource } from "../lib/resource/resource.core";
import { HELLA_RESOURCE } from "../lib/resource/resource.global";
import { ResourceResult } from "../lib/resource/resource.types";

// Test data
interface User {
  id: number;
  name: string;
}

const testUser: User = { id: 1, name: "Test User" };
const testUrl = "https://api.example.com/users/1";

describe("resource", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    HELLA_RESOURCE.cache.clear();
    HELLA_RESOURCE.activeRequests.clear();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function mockJsonResponse(data: any) {
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  describe("creation", () => {
    test("defaults", () => {
      const result = resource(testUrl);
      expect(result.data()).toBeUndefined();
      expect(result.loading()).toBe(false);
      expect(result.error()).toBeUndefined();
    });

    test("fetching", async () => {
      globalThis.fetch = mock(() =>
        Promise.resolve(mockJsonResponse(testUser))
      );
      const result = resource<User>(testUrl);
      await result.fetch();
      expect(result.data()).toEqual(testUser);
    });
  });

  describe("caching", () => {
    test("enabled", async () => {
      const fetchMock = mock(() => Promise.resolve(mockJsonResponse(testUser)));
      globalThis.fetch = fetchMock;

      const result = resource<User>(testUrl);
      await result.fetch();
      await result.fetch();

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    test("disabled", async () => {
      globalThis.fetch = mock(() =>
        Promise.resolve(mockJsonResponse(testUser))
      );
      const result = resource<User>(testUrl, { cacheTime: 0 });

      await result.fetch();
      await result.fetch();

      expect(result.data()).toEqual(testUser);
    });
  });

  describe("retries", () => {
    test("success", async () => {
      let attempts = 0;
      globalThis.fetch = mock(() => {
        attempts++;
        return attempts < 3
          ? Promise.reject(new Error("Retry error"))
          : Promise.resolve(mockJsonResponse(testUser));
      });

      const result = resource<User>(testUrl, { retries: 3, retryDelay: 0 });
      await result.fetch();

      expect(attempts).toBe(3);
      expect(result.data()).toEqual(testUser);
    });
  });

  describe("requests", () => {
    test("abort", async () => {
      const abortError = new DOMException("Aborted", "AbortError");
      globalThis.fetch = mock(() => Promise.reject(abortError));

      const result = resource(testUrl);
      const fetchPromise = result.fetch();
      result.abort();
      await fetchPromise;

      expect(result.error()).toBeUndefined();
      expect(HELLA_RESOURCE.activeRequests.size).toBe(0);
    });

    test("refresh", async () => {
      const fetchMock = mock(() => Promise.resolve(mockJsonResponse(testUser)));
      globalThis.fetch = fetchMock;

      const result = resource<User>(testUrl);
      await result.fetch();
      await result.refresh();

      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    test("pooling", async () => {
      globalThis.fetch = mock(() =>
        Promise.resolve(mockJsonResponse(testUser))
      );

      const results: ResourceResult<User>[] = [];
      const poolSize = 2;

      for (let i = 0; i < poolSize + 1; i++) {
        results.push(resource<User>(`${testUrl}/${i}`, { poolSize }));
      }

      expect(Promise.all(results.map((r) => r.fetch()))).rejects.toThrow();
    });
  });

  describe("transforms", () => {
    test("validation", async () => {
      globalThis.fetch = mock(() =>
        Promise.resolve(mockJsonResponse(testUser))
      );

      const validate = mock((data: User) => data.id === 1);
      const result = resource<User>(testUrl, { validate });
      await result.fetch();

      expect(validate).toHaveBeenCalledWith(testUser);
      expect(result.data()).toEqual(testUser);
    });

    test("mutation", async () => {
      globalThis.fetch = mock(() =>
        Promise.resolve(mockJsonResponse(testUser))
      );

      const result = resource<User>(testUrl, {
        transform: (user) => ({ ...user, name: user.name.toUpperCase() }),
      });
      await result.fetch();

      expect(result.data()?.name).toBe("TEST USER");
    });
  });

  describe("custom", () => {
    test("fetcher", async () => {
      const customFetcher = mock(() => Promise.resolve(testUser));
      const result = resource<User>(customFetcher);
      await result.fetch();

      expect(customFetcher).toHaveBeenCalled();
      expect(result.data()).toEqual(testUser);
    });
  });
});
