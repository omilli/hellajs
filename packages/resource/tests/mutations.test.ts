import { describe, test, expect, mock, beforeEach } from "bun:test";
import { delay, resetTestState } from "@utils/test-helpers.js";
import { resource, resourceCache } from "@hellajs/resource/bundle";
import { expectErrorMessage } from "./helpers";

describe("resource", () => {
  beforeEach(() => {
    resetTestState();
  });

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

  test("calls onMutate hook", async () => {
    const onMutate = mock((vars: unknown) => `context-${vars}`);

    const r = resource(
      async (vars: string) => delay(`result-${vars}`, 10),
      { onMutate }
    );

    await r.mutate("test");

    expect(onMutate).toHaveBeenCalledTimes(1);
    expect(onMutate).toHaveBeenCalledWith("test");
  });

  test("calls onSuccess and onSettled hooks", async () => {
    const onSuccess = mock(() => { });
    const onSettled = mock(() => { });

    const r = resource(
      async (vars: string) => delay(`result-${vars}`, 10),
      { onSuccess, onSettled }
    );

    await r.mutate("test");

    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledWith("result-test");
    expect(onSettled).toHaveBeenCalledTimes(1);
    expect(onSettled).toHaveBeenCalledWith("result-test", undefined, "test", undefined);
  });

  test("calls onError and onSettled on failure", async () => {
    const onError = mock(() => { });
    const onSettled = mock(() => { });

    const r = resource(
      async () => {
        throw new Error("Mutation failed");
      },
      { onError, onSettled }
    );

    await expectErrorMessage(r.mutate("test"), "Mutation failed");

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onSettled).toHaveBeenCalledTimes(1);
    expect(onSettled).toHaveBeenCalledWith(undefined, expect.any(Error), "test", undefined);
  });

  test("settles once when success-path onSettled throws", async () => {
    const onSettled = mock<(data?: unknown, error?: unknown, variables?: unknown, context?: unknown) => void>(() => {
      throw new Error("settled-boom");
    });

    const r = resource(async (vars: string) => delay(`saved-${vars}`, 10), { onSettled });

    await expectErrorMessage(r.mutate("v"), "settled-boom");

    expect(onSettled).toHaveBeenCalledTimes(1);
    expect(onSettled).toHaveBeenCalledWith("saved-v", undefined, "v", undefined);
    expect(r.status()).toBe("success");
    expect(r.data()).toBe("saved-v");
    expect(r.error()).toBeUndefined();
    expect(r.isFetching()).toBe(false);
  });

  test("skips invalidation when success-path onSettled throws", async () => {
    resourceCache.set("user:1", { id: 1 }, 60000);

    const r = resource(async () => delay("saved", 10), {
      onSettled: () => { throw new Error("settled-boom"); },
      invalidates: ["user:"],
    });

    await r.mutate("v").catch(() => { });

    expect(resourceCache.map.has("user:1")).toBe(true);
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

});