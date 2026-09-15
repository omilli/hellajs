import { describe, test, expect, beforeEach, mock } from "bun:test";
import { delay, resetTestState } from "@utils/test-helpers.js";
import { resource, resourceCache } from "@hellajs/resource/bundle";

describe("resource", () => {
  describe("deduplication", () => {
    beforeEach(() => { resetTestState(); });

    test("deduplicates concurrent requests with same key", async () => {
      const fetcher = mock(async (key: string) => {
        const result = `data-${key}-${fetcher.mock.calls.length}`;
        await delay(20);
        return result;
      });

      const r1 = resource(fetcher, { key: () => "user-1", deduplicate: true });
      const r2 = resource(fetcher, { key: () => "user-1", deduplicate: true });

      r1.fetch();
      r2.fetch();

      expect(r1.isLoading()).toBe(true);
      expect(r2.isLoading()).toBe(true);

      await delay(30);

      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(r1.data()).toBe("data-user-1-1");
      expect(r2.data()).toBe("data-user-1-1");
      expect(r1.status()).toBe("success");
      expect(r2.status()).toBe("success");
    });

    test("does not deduplicate requests with different keys", async () => {
      const fetcher = mock(async (key: string) => {
        const result = `data-${key}-${fetcher.mock.calls.length}`;
        await delay(20);
        return result;
      });

      const r1 = resource(fetcher, { key: () => "user-1", deduplicate: true });
      const r2 = resource(fetcher, { key: () => "user-2", deduplicate: true });

      r1.fetch();
      r2.fetch();

      await delay(30);

      expect(fetcher).toHaveBeenCalledTimes(2);
      expect(r1.data()).toBe("data-user-1-1");
      expect(r2.data()).toBe("data-user-2-2");
    });

    test("respects deduplicate option when disabled", async () => {
      const fetcher = mock(async (key: string) => {
        const result = `data-${key}-${fetcher.mock.calls.length}`;
        await delay(20);
        return result;
      });

      const r1 = resource(fetcher, { key: () => "user-1", deduplicate: false });
      const r2 = resource(fetcher, { key: () => "user-1", deduplicate: false });

      r1.fetch();
      r2.fetch();

      await delay(30);

      expect(fetcher).toHaveBeenCalledTimes(2);
      expect(r1.data()).toBe("data-user-1-1");
      expect(r2.data()).toBe("data-user-1-2");
    });

    test("force request bypasses deduplication", async () => {
      const fetcher = mock((key: string) => delay(`data-${key}-${fetcher.mock.calls.length}`, 20));

      const r1 = resource(fetcher, { key: () => "user-1", deduplicate: true });
      const r2 = resource(fetcher, { key: () => "user-1", deduplicate: true });

      r1.fetch({ force: true });
      await delay(5);

      r2.fetch({ force: true });

      await delay(30);

      expect(fetcher).toHaveBeenCalledTimes(2);
    });

    test("handles deduplication with errors", async () => {
      const fetcher = mock((key: string) => {
        return Promise.reject(`error-${key}-${fetcher.mock.calls.length}`);
      });

      const r1 = resource(fetcher, { key: () => "user-1", deduplicate: true });
      const r2 = resource(fetcher, { key: () => "user-1", deduplicate: true });

      r1.fetch();
      r2.fetch();

      await delay(20);

      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(r1.status()).toBe("error");
      expect(r2.status()).toBe("error");
      expect(r1.error()?.message).toBe("error-user-1-1");
      expect(r2.error()?.message).toBe("error-user-1-1");
    });

    test("handles abort during deduplication", async () => {
      let resolvePromise: (value: string) => void = () => { };
      const promise = new Promise<string>((resolve) => { resolvePromise = resolve; });
      const fetcher = () => promise;

      const r1 = resource(fetcher, {
        key: () => "user-1",
        deduplicate: true,
        initialData: "initial-1"
      });
      const r2 = resource(fetcher, {
        key: () => "user-1",
        deduplicate: true,
        initialData: "initial-2"
      });

      r1.fetch();
      r2.fetch();

      r1.abort();

      await delay(10);

      expect(r1.data()).toBe("initial-1");
      expect(r2.data()).toBe("initial-2");
      expect(r1.status()).toBe("idle");
      expect(r2.status()).toBe("idle");

      resolvePromise("resolved");
      await delay(10);

      expect(r1.data()).toBe("initial-1");
      expect(r2.data()).toBe("initial-2");
    });

    test("deduplicates each new in-flight round sequentially", async () => {
      const fetcher = mock(async (key: string) => {
        const result = `data-${key}-${fetcher.mock.calls.length}`;
        await delay(20);
        return result;
      });

      const r1 = resource(fetcher, { key: () => "user-1", deduplicate: true });
      const r2 = resource(fetcher, { key: () => "user-1", deduplicate: true });

      r1.fetch();
      r2.fetch();
      await delay(30);

      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(r1.data()).toBe("data-user-1-1");
      expect(r2.data()).toBe("data-user-1-1");

      r1.fetch();
      r2.fetch();
      await delay(30);

      expect(fetcher).toHaveBeenCalledTimes(2);
      expect(r1.data()).toBe("data-user-1-2");
      expect(r2.data()).toBe("data-user-1-2");
    });

    test("deduplication works with cache", async () => {
      const fetcher = mock(async (key: string) => {
        const result = `data-${key}-${fetcher.mock.calls.length}`;
        await delay(20);
        return result;
      });

      const r1 = resource(fetcher, {
        key: () => "user-1",
        deduplicate: true,
        cacheTime: 100
      });
      const r2 = resource(fetcher, {
        key: () => "user-1",
        deduplicate: true,
        cacheTime: 100
      });

      r1.fetch();
      r2.fetch();
      await delay(30);

      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(r1.data()).toBe("data-user-1-1");
      expect(r2.data()).toBe("data-user-1-1");

      r1.fetch();
      r2.fetch();

      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(r1.data()).toBe("data-user-1-1");
      expect(r2.data()).toBe("data-user-1-1");
    });

    test("mix of deduplicated and non-deduplicated requests", async () => {
      const fetcher = mock(async (key: string) => {
        const result = `data-${key}-${fetcher.mock.calls.length}`;
        await delay(20);
        return result;
      });

      const r1 = resource(fetcher, { key: () => "user-1", deduplicate: true });
      const r2 = resource(fetcher, { key: () => "user-1", deduplicate: true });
      const r3 = resource(fetcher, { key: () => "user-1", deduplicate: false });

      r1.fetch();
      r2.fetch();
      r3.fetch();

      await delay(30);

      expect(fetcher).toHaveBeenCalledTimes(2);
      expect(r1.data()).toBe("data-user-1-1");
      expect(r2.data()).toBe("data-user-1-1");
      expect(r3.data()).toBe("data-user-1-2");
    });

    test("a non-force fetch joins a force request that superseded an in-flight request", async () => {
      const fetcher = mock(async (key: string) => {
        const result = `data-${key}-${fetcher.mock.calls.length}`;
        await delay(60);
        return result;
      });

      const r = resource(fetcher, { key: () => "user-1", deduplicate: true });

      r.fetch();
      await delay(5);

      // Supersedes the in-flight request and overwrites its dedup slot
      r.fetch({ force: true });
      // Long enough for the superseded request's settle microtasks to run
      await delay(10);

      // The superseded settle must not have deleted the force registration
      r.fetch();

      await delay(150);

      expect(fetcher).toHaveBeenCalledTimes(2);
    });

    test("joining an already-aborted request clears activity flags", async () => {
      const fetcher = mock(async (key: string) => {
        await delay(60);
        return `data-${key}`;
      });

      const r1 = resource(fetcher, { key: () => "user-1", deduplicate: true });
      const r2 = resource(fetcher, { key: () => "user-1", deduplicate: true });

      r1.fetch();
      r1.abort();
      // Synchronous join onto the already-aborted registration — no await
      // between abort and fetch, so the owner's settle has not run yet
      r2.fetch();

      await delay(10);

      expect(r2.isFetching()).toBe(false);
      expect(r2.isLoading()).toBe(false);
      expect(r2.status()).toBe("idle");
    });

    test("prefetch registration survives a superseding force fetch", async () => {
      const fetcher = mock(async (key: string) => {
        const result = `data-${key}-${fetcher.mock.calls.length}`;
        // Prefetch settles early; the force fetch stays in flight past the join
        await delay(fetcher.mock.calls.length === 1 ? 30 : 120);
        return result;
      });

      resourceCache.prefetch({ fetcher, key: "user-1" });
      await delay(5);

      const r = resource(fetcher, { key: () => "user-1", deduplicate: true });
      // Overwrites the prefetch's dedup slot
      r.fetch({ force: true });
      // Waits past the prefetch settle — its finally must not delete the force
      // registration — while the force request is still in flight
      await delay(35);

      r.fetch();

      await delay(150);

      expect(fetcher).toHaveBeenCalledTimes(2);
    });
  });
});
