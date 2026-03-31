import { describe, test, expect } from "bun:test";
import { resource } from "@hellajs/resource/bundle";

const delay = <T>(val: T, ms: number = 10): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(val), ms));

describe("isFetching", () => {
  test("isFetching true during initial load", async () => {
    const r = resource(() => delay("data", 50));

    r.request();
    expect(r.isFetching()).toBe(true);
    expect(r.isLoading()).toBe(true);

    await delay(60);

    expect(r.isFetching()).toBe(false);
    expect(r.isLoading()).toBe(false);
  });

  test("loading false during background refetch", async () => {
    const r = resource(() => delay("data", 20), { cacheTime: 100 });

    r.request();
    await delay(30);

    expect(r.data()).toBe("data");
    expect(r.isLoading()).toBe(false);

    r.invalidate();

    // Has data, so loading=false but isFetching=true
    expect(r.isLoading()).toBe(false);
    expect(r.isFetching()).toBe(true);
    expect(r.data()).toBe("data"); // Still has stale data

    await delay(30);

    expect(r.isFetching()).toBe(false);
  });

  test("isIdle returns correct state", async () => {
    const r = resource(() => delay("data"));

    expect(r.isIdle()).toBe(true);

    r.request();
    expect(r.isIdle()).toBe(false);

    await delay(20);
    expect(r.isIdle()).toBe(false);

    r.reset();
    expect(r.isIdle()).toBe(true);
  });

  test("isFetching false after error", async () => {
    const r = resource(() => Promise.reject(new Error("Failed")));

    r.request();
    expect(r.isFetching()).toBe(true);

    await delay(20);

    expect(r.isFetching()).toBe(false);
    expect(r.error()?.message).toBe("Failed");
  });

  test("isFetching with initialData", async () => {
    const r = resource(() => delay("new data", 20), { initialData: "initial" });

    expect(r.isLoading()).toBe(false);
    expect(r.data()).toBe("initial");

    r.request();
    // Has initialData, so loading=false but isFetching=true
    expect(r.isLoading()).toBe(false);
    expect(r.isFetching()).toBe(true);

    await delay(30);

    expect(r.isFetching()).toBe(false);
    expect(r.data()).toBe("new data");
  });

  test("loading true when no initialData", async () => {
    const r = resource(() => delay("data", 20));

    r.request();
    expect(r.isLoading()).toBe(true);
    expect(r.isFetching()).toBe(true);

    await delay(30);

    expect(r.isLoading()).toBe(false);
    expect(r.isFetching()).toBe(false);
  });

  test("isIdle false after abort", async () => {
    const r = resource(() => delay("data", 50));

    r.request();
    expect(r.isIdle()).toBe(false);
    expect(r.isFetching()).toBe(true);

    r.abort();
    expect(r.isIdle()).toBe(true);
    expect(r.isFetching()).toBe(false);
  });
});
