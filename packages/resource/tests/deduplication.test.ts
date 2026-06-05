import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { resource, resourceCache } from "@hellajs/resource/bundle";

describe("resource", () => {
  beforeEach(() => { resourceCache.map.clear() });
  afterEach(() => { resourceCache.map.clear() });

  test("deduplicates concurrent requests with same key", async () => {
    let callCount = 0;

    const fetcher = async (key: string) => {
      callCount++;
      const result = `data-${key}-${callCount}`;
      await delay(20);
      return result;
    };

    const r1 = resource(fetcher, { key: () => "user-1", deduplicate: true });
    const r2 = resource(fetcher, { key: () => "user-1", deduplicate: true });

    r1.fetch();
    r2.fetch();

    expect(r1.isLoading()).toBe(true);
    expect(r2.isLoading()).toBe(true);

    await delay(30);

    expect(callCount).toBe(1);
    expect(r1.data()).toBe("data-user-1-1");
    expect(r2.data()).toBe("data-user-1-1");
    expect(r1.status()).toBe("success");
    expect(r2.status()).toBe("success");
  });

  test("does not deduplicate requests with different keys", async () => {
    let callCount = 0;

    const fetcher = async (key: string) => {
      callCount++;
      const result = `data-${key}-${callCount}`;
      await delay(20);
      return result;
    };

    const r1 = resource(fetcher, { key: () => "user-1", deduplicate: true });
    const r2 = resource(fetcher, { key: () => "user-2", deduplicate: true });

    r1.fetch();
    r2.fetch();

    await delay(30);

    expect(callCount).toBe(2);
    expect(r1.data()).toBe("data-user-1-1");
    expect(r2.data()).toBe("data-user-2-2");
  });

  test("respects deduplicate option when disabled", async () => {
    let callCount = 0;

    const fetcher = async (key: string) => {
      callCount++;
      const result = `data-${key}-${callCount}`;
      await delay(20);
      return result;
    };

    const r1 = resource(fetcher, { key: () => "user-1", deduplicate: false });
    const r2 = resource(fetcher, { key: () => "user-1", deduplicate: false });

    r1.fetch();
    r2.fetch();

    await delay(30);

    expect(callCount).toBe(2);
    expect(r1.data()).toBe("data-user-1-1");
    expect(r2.data()).toBe("data-user-1-2");
  });

  test("force request bypasses deduplication", async () => {
    let callCount = 0;
    const fetcher = (key: string) => {
      callCount++;
      return delay(`data-${key}-${callCount}`, 20);
    };

    const r1 = resource(fetcher, { key: () => "user-1", deduplicate: true });
    const r2 = resource(fetcher, { key: () => "user-1", deduplicate: true });

    r1.fetch({ force: true });
    await delay(5);

    r2.fetch({ force: true });

    await delay(30);

    expect(callCount).toBe(2);
  });

  test("handles deduplication with errors", async () => {
    let callCount = 0;
    const fetcher = (key: string) => {
      callCount++;
      return Promise.reject(`error-${key}-${callCount}`);
    };

    const r1 = resource(fetcher, { key: () => "user-1", deduplicate: true });
    const r2 = resource(fetcher, { key: () => "user-1", deduplicate: true });

    r1.fetch();
    r2.fetch();

    await delay(20);

    expect(callCount).toBe(1);
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

  test("sequential requests after deduplication work correctly", async () => {
    let callCount = 0;
    const fetcher = async (key: string) => {
      callCount++;
      const result = `data-${key}-${callCount}`;
      await delay(20);
      return result;
    };

    const r1 = resource(fetcher, { key: () => "user-1", deduplicate: true });
    const r2 = resource(fetcher, { key: () => "user-1", deduplicate: true });

    r1.fetch();
    r2.fetch();
    await delay(30);

    expect(callCount).toBe(1);
    expect(r1.data()).toBe("data-user-1-1");
    expect(r2.data()).toBe("data-user-1-1");

    r1.fetch();
    r2.fetch();
    await delay(30);

    expect(callCount).toBe(2);
    expect(r1.data()).toBe("data-user-1-2");
    expect(r2.data()).toBe("data-user-1-2");
  });

  test("deduplication works with cache", async () => {
    let callCount = 0;
    const fetcher = async (key: string) => {
      callCount++;
      const result = `data-${key}-${callCount}`;
      await delay(20);
      return result;
    };

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

    expect(callCount).toBe(1);
    expect(r1.data()).toBe("data-user-1-1");
    expect(r2.data()).toBe("data-user-1-1");

    r1.fetch();
    r2.fetch();

    expect(callCount).toBe(1);
    expect(r1.data()).toBe("data-user-1-1");
    expect(r2.data()).toBe("data-user-1-1");
  });

  test("mix of deduplicated and non-deduplicated requests", async () => {
    let callCount = 0;
    const fetcher = async (key: string) => {
      callCount++;
      const result = `data-${key}-${callCount}`;
      await delay(20);
      return result;
    };

    const r1 = resource(fetcher, { key: () => "user-1", deduplicate: true });
    const r2 = resource(fetcher, { key: () => "user-1", deduplicate: true });
    const r3 = resource(fetcher, { key: () => "user-1", deduplicate: false });

    r1.fetch();
    r2.fetch();
    r3.fetch();

    await delay(30);

    expect(callCount).toBe(2);
    expect(r1.data()).toBe("data-user-1-1");
    expect(r2.data()).toBe("data-user-1-1");
    expect(r3.data()).toBe("data-user-1-2");
  });
});