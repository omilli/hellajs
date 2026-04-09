import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { resource, resourceCache } from "@hellajs/resource/bundle";
import { effect } from "@hellajs/core";

const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
const setup = () => {
  resourceCache.map.clear();
  return () => resourceCache.map.clear();
};

describe("refetchOnWindowFocus", () => {
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

  const setVisibility = (state: "visible" | "hidden") => {
    Object.defineProperty(document, "visibilityState", {
      value: state,
      writable: true,
      configurable: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  };

  test("refetches when tab becomes visible", async () => {
    const cleanup = setup();
    let count = 0;
    const r = resource(() => wait(5).then(() => `data-${++count}`), {
      refetchOnWindowFocus: true,
      refetchOnKeyChange: true,
    });

    effect(() => r.status());
    await wait(20);

    expect(count).toBe(1);

    // Simulate tab hidden then visible
    setVisibility("hidden");
    setVisibility("visible");

    await wait(20);

    expect(count).toBe(2);

    r.dispose();
    cleanup();
  });

  test("does not refetch when disabled", async () => {
    const cleanup = setup();
    let count = 0;
    const r = resource(() => wait(5).then(() => `data-${++count}`), {
      refetchOnWindowFocus: false,
      refetchOnKeyChange: true,
    });

    effect(() => r.status());
    await wait(20);

    expect(count).toBe(1);

    setVisibility("hidden");
    setVisibility("visible");

    await wait(20);

    expect(count).toBe(1);

    r.dispose();
    cleanup();
  });

  test("stops refetching on dispose", async () => {
    const cleanup = setup();
    let count = 0;
    const r = resource(() => wait(5).then(() => `data-${++count}`), {
      refetchOnWindowFocus: true,
      refetchOnKeyChange: true,
    });

    effect(() => r.status());
    await wait(20);

    expect(count).toBe(1);

    r.dispose();

    setVisibility("hidden");
    setVisibility("visible");

    await wait(20);

    expect(count).toBe(1);

    cleanup();
  });

  test("does not refetch when hidden (only on visible)", async () => {
    const cleanup = setup();
    let count = 0;
    const r = resource(() => wait(5).then(() => `data-${++count}`), {
      refetchOnWindowFocus: true,
      refetchOnKeyChange: true,
    });

    effect(() => r.status());
    await wait(20);

    expect(count).toBe(1);

    // Just hidden - should not refetch
    setVisibility("hidden");
    await wait(20);

    expect(count).toBe(1);

    r.dispose();
    cleanup();
  });

  test("works without auto mode (requires manual trigger)", async () => {
    const cleanup = setup();
    let count = 0;
    const r = resource(() => wait(5).then(() => `data-${++count}`), {
      refetchOnWindowFocus: true,
    });

    effect(() => r.status());
    await wait(20);

    // No auto, so no fetch yet
    expect(count).toBe(0);

    // Manual trigger
    r.fetch({ force: true });
    await wait(20);

    expect(count).toBe(1);

    setVisibility("hidden");
    setVisibility("visible");

    await wait(20);

    expect(count).toBe(2);

    r.dispose();
    cleanup();
  });

  test("respects enabled: false", async () => {
    const cleanup = setup();
    let count = 0;
    const r = resource(() => wait(5).then(() => `data-${++count}`), {
      refetchOnWindowFocus: true,
      refetchOnKeyChange: true,
      enabled: false,
    });

    effect(() => r.status());
    await wait(20);

    expect(count).toBe(0);

    setVisibility("hidden");
    setVisibility("visible");

    await wait(20);

    expect(count).toBe(0);

    r.dispose();
    cleanup();
  });
});
