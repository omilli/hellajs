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

  test("runs overlapping mutations independently", async () => {
    const fetcher = mock((vars: string) => delay(`result-${vars}`, vars === "slow" ? 30 : 10));
    const onMutate = mock((vars: unknown) => `ctx-${vars}`);
    const settles: Array<[unknown, unknown, unknown, unknown]> = [];
    const r = resource(fetcher, {
      onMutate,
      onSettled: (data, error, vars, context) => { settles.push([data, error, vars, context]); }
    });

    expect(await Promise.all([r.mutate("slow"), r.mutate("fast")])).toEqual(["result-slow", "result-fast"]);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(onMutate).toHaveBeenCalledTimes(2);
    expect(settles).toEqual([
      ["result-fast", undefined, "fast", "ctx-fast"],
      ["result-slow", undefined, "slow", "ctx-slow"]
    ]);
  });

  test("rolls back with the failing call's own context when mutations overlap", async () => {
    const settles: Array<[unknown, unknown, unknown, unknown]> = [];
    const r = resource(
      async (vars: string) => {
        if (vars === "slow-bad") {
          await delay(20);
          throw new Error("Mutation failed");
        }
        return "ok";
      },
      {
        onMutate: (vars) => `ctx-${vars}`,
        onSettled: (data, error, vars, context) => { settles.push([data, error, vars, context]); }
      }
    );

    const first = r.mutate("slow-bad");
    await r.mutate("quick");
    await first.catch(() => { });

    // The second onMutate ran before the first settled; the rollback still sees the first call's context
    expect(settles[0]).toEqual(["ok", undefined, "quick", "ctx-quick"]);
    expect(settles[1]![0]).toBeUndefined();
    expect(settles[1]![1]).toBeInstanceOf(Error);
    expect((settles[1]![1] as Error).message).toBe("Mutation failed");
    expect(settles[1]![2]).toBe("slow-bad");
    expect(settles[1]![3]).toBe("ctx-slow-bad");
  });

  test("does not abort an in-flight mutation when a read starts", async () => {
    let resolveMutation: (value: string) => void = () => { };
    const onSettled = mock(() => { });
    const r = resource(
      async (vars: unknown): Promise<string> =>
        vars === "write" ? new Promise((resolve) => { resolveMutation = resolve; }) : delay("read-data", 5),
      { onSettled }
    );

    const mutation = r.mutate("write");
    await delay(1);

    const read = r.fetch({ force: true });
    expect(await read).toBe("read-data");

    resolveMutation("saved");
    expect(await mutation).toBe("saved");
    expect(onSettled).toHaveBeenCalledTimes(1);
  });

  test("does not abort an in-flight read when a mutation starts", async () => {
    let resolveRead: (value: string) => void = () => { };
    const r = resource(
      async (vars: unknown): Promise<string> =>
        vars === "write" ? delay("saved", 5) : new Promise((resolve) => { resolveRead = resolve; })
    );

    const read = r.fetch({ force: true });
    await delay(1);

    expect(await r.mutate("write")).toBe("saved");
    resolveRead("read-data");
    expect(await read).toBe("read-data");
    expect(r.data()).toBe("read-data");
  });

  test("retries a failing mutation until it succeeds", async () => {
    const fetcher = mock(() => {
      if (fetcher.mock.calls.length < 2) return Promise.reject(new Error("x"));
      return delay("saved");
    });
    const r = resource(fetcher, { retry: 2, retryDelay: 10 });

    const result = await r.mutate("input");

    expect(result).toBe("saved");
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(r.data()).toBe("saved");
  });

  test("aborts during a mutation retry delay without settling", async () => {
    const fetcher = mock(() => Promise.reject(new Error("x")));
    const onSettled = mock(() => { });
    const r = resource(fetcher, { retry: 10, retryDelay: 1000, onSettled });

    const mutation = r.mutate("input");
    await delay(10);
    r.abort();

    try {
      await mutation;
      expect(true).toBe(false);
    } catch (err) {
      expect(err).toBeInstanceOf(DOMException);
      expect((err as DOMException).name).toBe("AbortError");
    }

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(onSettled).toHaveBeenCalledTimes(0);
    expect(r.isFetching()).toBe(false);
    expect(r.isLoading()).toBe(false);
    expect(r.status()).toBe("idle");
  });
});