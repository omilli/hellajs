import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import { delay, resetTestState } from "@utils/test-helpers.js";
import { resource, resourceCache } from "@hellajs/resource/bundle";

describe("resource", () => {
  describe("invalidates", () => {
    let originalPrefix: (prefix: string) => number;
    let originalPattern: (pattern: RegExp) => number;

    beforeEach(() => {
      resetTestState();
      originalPrefix = resourceCache.invalidateByPrefix;
      originalPattern = resourceCache.invalidateByPattern;
    });

    afterEach(() => {
      resourceCache.invalidateByPrefix = originalPrefix;
      resourceCache.invalidateByPattern = originalPattern;
    });

    const spyInvalidators = () => {
      const prefixSpy = mock(() => 0);
      const patternSpy = mock(() => 0);
      resourceCache.invalidateByPrefix = prefixSpy as unknown as typeof resourceCache.invalidateByPrefix;
      resourceCache.invalidateByPattern = patternSpy as unknown as typeof resourceCache.invalidateByPattern;
      return { prefixSpy, patternSpy };
    };

    test("calls invalidateByPrefix on mutation success", async () => {
      const { prefixSpy, patternSpy } = spyInvalidators();

      const r = resource(async () => "ok", { invalidates: ["user:"] });
      await r.mutate({});

      expect(prefixSpy).toHaveBeenCalledTimes(1);
      expect(prefixSpy).toHaveBeenCalledWith("user:");
      expect(patternSpy).not.toHaveBeenCalled();
    });

    test("calls invalidateByPattern on mutation success", async () => {
      const { prefixSpy, patternSpy } = spyInvalidators();

      const r = resource(async () => "ok", { invalidates: [/^posts:\d+$/] });
      await r.mutate({});

      expect(patternSpy).toHaveBeenCalledTimes(1);
      expect(patternSpy).toHaveBeenCalledWith(/^posts:\d+$/);
      expect(prefixSpy).not.toHaveBeenCalled();
    });

    test("does not invalidate on mutation error or abort", async () => {
      const { prefixSpy, patternSpy } = spyInvalidators();

      const failing = resource(async () => { throw new Error("boom"); }, { invalidates: ["user:"] });
      await failing.mutate({}).catch(() => {});

      const controller = new AbortController();
      const aborting = resource(() => new Promise<string>(() => {}), {
        invalidates: ["user:"],
        abortSignal: controller.signal,
      });
      const pending = aborting.mutate({});
      await delay(1);
      controller.abort();
      await pending.catch(() => {});

      expect(prefixSpy).not.toHaveBeenCalled();
      expect(patternSpy).not.toHaveBeenCalled();
    });

    test("deletes cache entries without auto-refetching mounted resources", async () => {
      const fetcher = mock(async () => ({ id: 1, name: "John" }));
      const watcher = resource(fetcher, { key: "user:1", cacheTime: 60000, refetchOnKeyChange: true });
      await delay(10);
      expect(resourceCache.map.has("user:1")).toBe(true);
      expect(watcher.data()).toEqual({ id: 1, name: "John" });

      const mutator = resource(async () => "saved", { invalidates: ["user:"] });
      await mutator.mutate({});

      expect(resourceCache.map.has("user:1")).toBe(false);
      expect(watcher.data()).toEqual({ id: 1, name: "John" });
      expect(fetcher).toHaveBeenCalledTimes(1);
    });
  });
});
