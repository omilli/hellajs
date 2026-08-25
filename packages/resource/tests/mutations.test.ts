import { describe, test, expect, mock } from "bun:test";
import {delay} from "@utils/test-helpers.js";
import { resource } from "@hellajs/resource/bundle";

describe("resource", () => {
  test("performs successful mutation", async () => {
    const mutationFn = async (vars: { name: string }) => {
      await delay(10);
      return { id: 1, name: vars.name };
    };

    const r = resource(mutationFn);

    const result = await r.mutate({ name: "John" });

    expect(result).toEqual({ id: 1, name: "John" });
    expect(r.data()).toEqual({ id: 1, name: "John" });
    expect(r.status()).toBe("success");
  });

  test("handles timeout", async () => {
    const r = resource(() => delay("response", 50), { timeout: 10 });

    try {
      await r.mutate("input");
      expect(true).toBe(false);
    } catch (err) {
      expect(err).toBeInstanceOf(DOMException);
      expect((err as DOMException).name).toBe("AbortError");
    }
  });

  test("handles external AbortSignal", async () => {
    const controller = new AbortController();
    const r = resource(() => delay("response", 50), { abortSignal: controller.signal });

    setTimeout(() => controller.abort(), 10);

    try {
      await r.mutate("input");
      expect(true).toBe(false);
    } catch (err) {
      expect(err).toBeInstanceOf(DOMException);
      expect((err as DOMException).name).toBe("AbortError");
    }
  });

  test("calls onMutate hook", async () => {
    let mutateContext: unknown;

    const r = resource(
      async (vars: string) => delay(`result-${vars}`, 10),
      {
        onMutate: async (vars) => {
          mutateContext = `context-${vars}`;
          return mutateContext;
        }
      }
    );

    await r.mutate("test");
    expect(mutateContext).toBe("context-test");
  });

  test("calls onSuccess and onSettled hooks", async () => {
    let successCalled = false;
    const settledResult: { result?: string, error?: unknown, vars?: unknown } = {};

    const r = resource(
      async (vars: string) => delay(`result-${vars}`, 10),
      {
        onSuccess: () => { successCalled = true; },
        onSettled: async (result, error, vars) => {
          settledResult.result = result;
          settledResult.error = error;
          settledResult.vars = vars;
        }
      }
    );

    await r.mutate("test");

    expect(successCalled).toBe(true);
    expect(settledResult.result).toBe("result-test");
    expect(settledResult.error).toBeUndefined();
    expect(settledResult.vars).toBe("test");
  });

  test("calls onError and onSettled on failure", async () => {
    const onError = mock(() => {});
    let settledError: unknown;

    const r = resource(
      async () => {
        throw new Error("Mutation failed");
      },
      {
        onError,
        onSettled: async (_result, error) => {
          settledError = error;
        }
      }
    );

    try {
      await r.mutate("test");
      expect(true).toBe(false);
    } catch {
      expect(onError).toHaveBeenCalledTimes(1);
      expect(settledError).toBeInstanceOf(Error);
      expect((settledError as Error).message).toBe("Mutation failed");
    }
  });

  test("handles abort during execution", async () => {
    const promise = new Promise<string>(() => { });

    const r = resource(() => promise);

    const mutationPromise = r.mutate("test");
    await delay(1);

    r.abort();

    try {
      await mutationPromise;
      expect(true).toBe(false);
    } catch (err) {
      expect(err).toBeInstanceOf(DOMException);
      expect((err as DOMException).name).toBe("AbortError");
    }

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

    try {
      await mutationPromise;
    } catch (err) {
      expect(err).toBeInstanceOf(DOMException);
      expect((err as DOMException).name).toBe("AbortError");
    }

    expect(onMutate).toHaveBeenCalledTimes(1);
    expect(onSettled).toHaveBeenCalledTimes(0);
  });

  test("handles already aborted external signal", async () => {
    const controller = new AbortController();
    controller.abort();

    const r = resource(() => delay("response", 10), { abortSignal: controller.signal });

    try {
      await r.mutate("test");
      expect(true).toBe(false);
    } catch (err) {
      expect(err).toBeInstanceOf(DOMException);
      expect((err as DOMException).name).toBe("AbortError");
    }
  });

  test("reset clears mutation context", async () => {
    const r = resource(() => delay("data"));

    await r.mutate("input");
    expect(r.data()).toBe("data");
    expect(r.status()).toBe("success");

    r.reset();

    expect(r.data()).toBeUndefined();
    expect(r.status()).toBe("idle");
    expect(r.error()).toBeUndefined();
  });

  test("clears isFetching when mutation is aborted by timeout", async () => {
    const r = resource(() => new Promise(() => { }), { timeout: 30 });

    try {
      await r.mutate("input");
      expect(true).toBe(false);
    } catch (err) {
      expect(err).toBeInstanceOf(DOMException);
      expect((err as DOMException).name).toBe("AbortError");
    }

    expect(r.isFetching()).toBe(false);
    expect(r.isLoading()).toBe(false);
    expect(r.error()).toBeUndefined();
    expect(r.status()).toBe("idle");
  });

  test("clears isFetching when mutation is aborted by external signal", async () => {
    const controller = new AbortController();
    const r = resource(() => new Promise(() => { }), { abortSignal: controller.signal });

    setTimeout(() => controller.abort(), 10);

    try {
      await r.mutate("input");
      expect(true).toBe(false);
    } catch (err) {
      expect(err).toBeInstanceOf(DOMException);
      expect((err as DOMException).name).toBe("AbortError");
    }

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

    try {
      await mutationPromise;
      expect(true).toBe(false);
    } catch (err) {
      expect(err).toBeInstanceOf(DOMException);
      expect((err as DOMException).name).toBe("AbortError");
    }

    expect(r.isFetching()).toBe(false);
    expect(r.isLoading()).toBe(false);
    expect(r.error()).toBeUndefined();
    expect(r.status()).toBe("idle");
  });

  test("isFetching true during mutation execution", async () => {
    const r = resource(() => delay("result", 50));

    const promise = r.mutate("input");
    await delay(1);

    expect(r.isFetching()).toBe(true);
    expect(r.status()).toBe("loading");

    await promise;

    expect(r.isFetching()).toBe(false);
    expect(r.status()).toBe("success");
  });

  test("isLoading reflects data presence during mutation execution", async () => {
    const r = resource<string>(() => delay("result", 50), { initialData: "old" });

    const promise = r.mutate("input");
    await delay(1);

    // Has prior data via initialData, so isLoading=false but isFetching=true
    expect(r.isLoading()).toBe(false);
    expect(r.isFetching()).toBe(true);

    await promise;

    expect(r.isLoading()).toBe(false);
    expect(r.isFetching()).toBe(false);
    expect(r.data()).toBe("result");
  });
});