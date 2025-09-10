import { describe, test, expect } from "bun:test";
import { resource } from "../../packages/resource";

const delay = <T>(val: T, ms: number = 10): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(val), ms));

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
    let mutateContext: any;

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
    let settledResult: any;

    const r = resource(
      async (vars: string) => delay(`result-${vars}`, 10),
      {
        onSuccess: () => { successCalled = true; },
        onSettled: async (result, error, vars, context) => {
          settledResult = { result, error, vars, context };
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
    let errorCalled = false;
    let settledError: any;

    const r = resource(
      async () => {
        throw new Error("Mutation failed");
      },
      {
        onError: () => { errorCalled = true; },
        onSettled: async (_result: any, error: any) => {
          settledError = error;
        }
      }
    );

    try {
      await r.mutate("test");
      expect(true).toBe(false);
    } catch (err) {
      expect(errorCalled).toBe(true);
      expect(settledError).toBeInstanceOf(Error);
      expect((settledError as Error).message).toBe("Mutation failed");
    }
  });

  test("handles abort during execution", async () => {
    let resolvePromise: (value: string) => void = () => { };
    const promise = new Promise<string>((resolve) => { resolvePromise = resolve; });

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

    expect(r.loading()).toBe(false);
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
});