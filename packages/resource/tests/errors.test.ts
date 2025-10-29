import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { resource } from "../";

const delay = <T>(val: T, ms: number = 10): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(val), ms));

describe("resource", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("handles errors", async () => {
    const r = resource(() => Promise.reject("API Error"));
    r.request();
    expect(r.loading()).toBe(true);
    await delay(20);
    expect(r.status()).toBe("error");
    expect(r.error()?.message).toBe("API Error");
    expect(r.error()?.category).toBe("unknown");
    expect(r.loading()).toBe(false);
  });

  test("handles HTTP errors from URL", async () => {
    globalThis.fetch = (async () => ({
      ok: false,
      status: 404,
      statusText: "Not Found"
    })) as unknown as typeof globalThis.fetch;

    const r = resource("https://api.example.com/notfound");
    r.request();
    await delay(20);
    expect(r.status()).toBe("error");
    expect(r.error()?.message).toBe("HTTP 404: Not Found");
    expect(r.error()?.category).toBe("not_found");
    expect(r.error()?.statusCode).toBe(404);
  });

  test("handles AbortError from DOMException", async () => {
    const r = resource(() => Promise.reject(new DOMException("Request was aborted", "AbortError")), {
      initialData: "initial"
    });
    r.request();
    await delay(20);
    expect(r.status()).toBe("idle");
    expect(r.data()).toBe("initial");
    expect(r.loading()).toBe(false);
  });

  test("handles HTTP client error (4xx)", async () => {
    const r = resource(() => Promise.reject(new Error("HTTP 400: Bad Request")));
    r.request();
    await delay(20);
    expect(r.status()).toBe("error");
    expect(r.error()?.message).toBe("HTTP 400: Bad Request");
    expect(r.error()?.category).toBe("client");
    expect(r.error()?.statusCode).toBe(400);
    expect(r.error()?.originalError).toBeInstanceOf(Error);
  });

  test("handles HTTP server error (5xx)", async () => {
    const r = resource(() => Promise.reject(new Error("HTTP 500: Internal Server Error")));
    r.request();
    await delay(20);
    expect(r.status()).toBe("error");
    expect(r.error()?.message).toBe("HTTP 500: Internal Server Error");
    expect(r.error()?.category).toBe("server");
    expect(r.error()?.statusCode).toBe(500);
    expect(r.error()?.originalError).toBeInstanceOf(Error);
  });

  test("handles HTTP error with status but not classified (3xx)", async () => {
    const r = resource(() => Promise.reject(new Error("HTTP 300: Multiple Choices")));
    r.request();
    await delay(20);
    expect(r.status()).toBe("error");
    expect(r.error()?.message).toBe("HTTP 300: Multiple Choices");
    expect(r.error()?.category).toBe("unknown");
    expect(r.error()?.originalError).toBeInstanceOf(Error);
  });

  test("handles external AbortSignal already aborted", async () => {
    const controller = new AbortController();
    controller.abort();

    const r = resource(() => delay("response", 10), {
      abortSignal: controller.signal,
      initialData: "initial"
    });

    r.request();
    await delay(20);

    expect(r.data()).toBe("initial");
    expect(r.loading()).toBe(false);
    expect(r.status()).toBe("idle");
  });

  test("handles timeout abort", async () => {
    const r = resource(() => delay("response", 50), {
      timeout: 10,
      initialData: "initial"
    });

    r.request();
    await delay(20);

    expect(r.data()).toBe("initial");
    expect(r.loading()).toBe(false);
    expect(r.status()).toBe("idle");
  });

  test("aborts request", async () => {
    const r = resource(() => delay({ theme: "dark" }), { initialData: { theme: "light" } });
    r.request();
    await delay(1);
    r.abort();
    flush();
    expect(r.data()?.theme).toBe("light");
    expect(r.status()).toBe("idle");
  });

  test("ignores late responses after abort", async () => {
    let resolvePromise: (value: unknown) => void = () => { };
    const promise = new Promise((resolve) => { resolvePromise = resolve; });
    const r = resource(() => promise, { initialData: "initial" });
    r.request();
    r.abort();
    resolvePromise("resolved");
    flush();
    expect(r.data()).toBe("initial");
    expect(r.status()).toBe("idle");
  });

  test("allows requests after abort", async () => {
    const r = resource(() => delay("new data"), { initialData: "initial" });
    r.request();
    r.abort();
    flush();
    expect(r.data()).toBe("initial");
    r.request();
    await delay(20);
    expect(r.data()).toBe("new data");
    expect(r.status()).toBe("success");
  });

  test("handles race condition with immediate abort after request", async () => {
    const r = resource(() => delay("data", 10), { initialData: "initial" });

    r.request();
    r.abort();

    await delay(20);

    expect(r.data()).toBe("initial");
    expect(r.status()).toBe("idle");
    expect(r.loading()).toBe(false);
  });
});