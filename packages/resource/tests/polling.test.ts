import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { resource, resourceCache } from "@hellajs/resource/bundle";
import { effect } from "@hellajs/core";

const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
const setup = () => {
  resourceCache.map.clear();
  return () => resourceCache.map.clear();
};

describe("resource", () => {
  test("polls at interval with refetchOnKeyChange", async () => {
    const cleanup = setup();
    let count = 0;
    const r = resource(() => wait(5).then(() => `data-${++count}`), {
      refetchInterval: 30,
      refetchOnKeyChange: true,
    });

    effect(() => r.status());
    await wait(100);

    expect(count).toBeGreaterThanOrEqual(2);
    r.dispose();
    cleanup();
  });

  test("requires refetchOnKeyChange to poll", async () => {
    const cleanup = setup();
    let count = 0;
    const r = resource(() => wait(5).then(() => `data-${++count}`), {
      refetchInterval: 30,
    });

    effect(() => r.status());
    await wait(80);

    expect(count).toBe(0);
    r.dispose();
    cleanup();
  });

  test.each(["abort", "reset"] as const)("stops polling on %s", async (method) => {
    const cleanup = setup();
    let count = 0;
    const r = resource(() => wait(5).then(() => `data-${++count}`), {
      refetchInterval: 20,
      refetchOnKeyChange: true,
    });

    effect(() => r.status());
    await wait(50);
    r[method]();
    const countAfter = count;

    await wait(50);
    expect(count).toBe(countAfter);
    r.dispose();
    cleanup();
  });

  test("dynamic interval based on data", async () => {
    const cleanup = setup();
    let count = 0;
    const r = resource(
      () => wait(5).then(() => ({ status: count++ > 0 ? "healthy" : "unhealthy" })),
      {
        refetchInterval: (data) => (!data ? 20 : data.status === "unhealthy" ? 20 : 100),
        refetchOnKeyChange: true,
      }
    );

    effect(() => r.status());
    await wait(60);

    expect(count).toBeGreaterThanOrEqual(2);
    r.dispose();
    cleanup();
  });

  test.each([false, 0])("refetchInterval %p disables polling", async (value) => {
    const cleanup = setup();
    let count = 0;
    const r = resource(() => wait(5).then(() => `data-${++count}`), {
      refetchInterval: value as false | 0,
      refetchOnKeyChange: true,
    });

    effect(() => r.status());
    await wait(80);

    expect(count).toBe(1);
    r.dispose();
    cleanup();
  });

  test("respects enabled: false", async () => {
    const cleanup = setup();
    let count = 0;
    const r = resource(() => wait(5).then(() => `data-${++count}`), {
      refetchInterval: 20,
      refetchOnKeyChange: true,
      enabled: false,
    });

    effect(() => r.status());
    await wait(80);

    expect(count).toBe(0);
    r.dispose();
    cleanup();
  });
});

describe("resource", () => {
  let originalVisibility: string;

  beforeEach(() => {
    resourceCache.map.clear();
    originalVisibility = document.visibilityState;
  });

  afterEach(() => {
    resourceCache.map.clear();
    Object.defineProperty(document, "visibilityState", {
      value: originalVisibility,
      writable: true,
      configurable: true,
    });
  });

  const setHidden = () => {
    Object.defineProperty(document, "visibilityState", {
      value: "hidden",
      writable: true,
      configurable: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  };

  const setVisible = () => {
    Object.defineProperty(document, "visibilityState", {
      value: "visible",
      writable: true,
      configurable: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  };

  test("pauses when hidden, resumes when visible", async () => {
    let count = 0;
    const r = resource(() => wait(5).then(() => `data-${++count}`), {
      refetchInterval: 20,
      refetchOnKeyChange: true,
    });

    effect(() => r.status());
    await wait(50);
    expect(count).toBeGreaterThanOrEqual(1);

    setHidden();
    const countWhenHidden = count;
    await wait(60);
    expect(count).toBe(countWhenHidden);

    setVisible();
    await wait(50);
    expect(count).toBeGreaterThan(countWhenHidden);

    r.dispose();
  });

  test("continues polling in background when enabled", async () => {
    let count = 0;
    const r = resource(() => wait(5).then(() => `data-${++count}`), {
      refetchInterval: 20,
      refetchIntervalInBackground: true,
      refetchOnKeyChange: true,
    });

    effect(() => r.status());
    await wait(50);

    setHidden();
    const countWhenHidden = count;
    await wait(70);
    expect(count).toBeGreaterThan(countWhenHidden);

    r.dispose();
  });
});
