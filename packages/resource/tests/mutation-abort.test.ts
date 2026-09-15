import { describe, test, expect, mock, beforeEach } from "bun:test";
import { delay, resetTestState } from "@utils/test-helpers.js";
import { resource } from "@hellajs/resource/bundle";
import { expectAbortError } from "./helpers";

describe("resource", () => {
  beforeEach(() => {
    resetTestState();
  });

  describe("mutation abort", () => {
    test("handles timeout", async () => {
      const r = resource(() => delay("response", 50), { timeout: 10 });

      await expectAbortError(r.mutate("input"));
    });

    test("handles external AbortSignal", async () => {
      const controller = new AbortController();
      const r = resource(() => delay("response", 50), { abortSignal: controller.signal });

      setTimeout(() => controller.abort(), 10);

      await expectAbortError(r.mutate("input"));
    });

    test("handles abort during execution", async () => {
      const promise = new Promise<string>(() => { });

      const r = resource(() => promise);

      const mutationPromise = r.mutate("test");
      await delay(1);

      r.abort();

      await expectAbortError(mutationPromise);

      expect(r.isLoading()).toBe(false);
    });

    test("onSettled is not called when mutation is aborted after onMutate ran", async () => {
      const promise = new Promise<string>(() => { });
      const onMutate = mock(() => "context");
      const onSettled = mock(() => {});

      const r = resource(() => promise, { onMutate, onSettled });

      const mutationPromise = r.mutate("test");
      await delay(1);

      r.abort();

      await expectAbortError(mutationPromise);

      expect(onMutate).toHaveBeenCalledTimes(1);
      expect(onSettled).toHaveBeenCalledTimes(0);
    });

    test("handles already aborted external signal", async () => {
      const controller = new AbortController();
      controller.abort();

      const r = resource(() => delay("response", 10), { abortSignal: controller.signal });

      await expectAbortError(r.mutate("test"));
    });

    test("clears isFetching when mutation is aborted by timeout", async () => {
      const r = resource(() => new Promise(() => { }), { timeout: 30 });

      await expectAbortError(r.mutate("input"));

      expect(r.isFetching()).toBe(false);
      expect(r.isLoading()).toBe(false);
      expect(r.error()).toBeUndefined();
      expect(r.status()).toBe("idle");
    });

    test("clears isFetching when mutation is aborted by external signal", async () => {
      const controller = new AbortController();
      const r = resource(() => new Promise(() => { }), { abortSignal: controller.signal });

      setTimeout(() => controller.abort(), 10);

      await expectAbortError(r.mutate("input"));

      expect(r.isFetching()).toBe(false);
      expect(r.isLoading()).toBe(false);
      expect(r.error()).toBeUndefined();
      expect(r.status()).toBe("idle");
    });

    test("clears isFetching when mutation is aborted via abort()", async () => {
      const r = resource(() => new Promise(() => { }));

      const mutationPromise = r.mutate("input");
      await delay(1);

      r.abort();

      await expectAbortError(mutationPromise);

      expect(r.isFetching()).toBe(false);
      expect(r.isLoading()).toBe(false);
      expect(r.error()).toBeUndefined();
      expect(r.status()).toBe("idle");
    });

    test("aborts during a mutation retry delay without settling", async () => {
      const fetcher = mock(() => Promise.reject(new Error("x")));
      const onSettled = mock(() => { });
      const r = resource(fetcher, { retry: 10, retryDelay: 1000, onSettled });

      const mutation = r.mutate("input");
      await delay(10);
      r.abort();

      await expectAbortError(mutation);

      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(onSettled).toHaveBeenCalledTimes(0);
      expect(r.isFetching()).toBe(false);
      expect(r.isLoading()).toBe(false);
      expect(r.status()).toBe("idle");
    });
  });
});
