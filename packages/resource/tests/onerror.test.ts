import { describe, test, expect, beforeEach, mock } from "bun:test";
import { delay, resetTestState } from "@utils/test-helpers.js";
import { resource } from "@hellajs/resource/bundle";

describe("resource", () => {
  beforeEach(() => {
    resetTestState();
  });

  describe("onError", () => {
    test("does not fire onError when a fetch starts", async () => {
      const onError = mock(() => {});
      const fetcher = mock(() => delay("value", 5));
      const r = resource(fetcher, { refetchOnKeyChange: true, onError });

      for (let i = 0; i < 100; i++) {
        if (r.data() !== undefined) break;
        await delay(10);
      }
      // Fetch ran to completion without a single onError call
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(onError).not.toHaveBeenCalled();
    });

    test("does not fire onError on successful completion", async () => {
      const onSuccess = mock(() => {});
      const onError = mock(() => {});
      const r = resource(() => delay("value", 5), { refetchOnKeyChange: true, onSuccess, onError });

      for (let i = 0; i < 100; i++) {
        if (r.data() !== undefined) break;
        await delay(10);
      }
      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(onError).not.toHaveBeenCalled();
    });

    test("does not fire onError on a cache hit", async () => {
      const onError = mock(() => {});
      const fetcher = mock(() => delay("value", 5));
      const r = resource(fetcher, { cacheTime: 60000, onError });

      r.fetch();
      for (let i = 0; i < 100; i++) {
        if (fetcher.mock.calls.length >= 1) break;
        await delay(10);
      }
      await delay(10);

      r.fetch(); // cache hit — served synchronously
      await delay(10);

      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(onError).not.toHaveBeenCalled();
    });

    test("does not fire onError after abort", async () => {
      const onError = mock(() => {});
      const fetcher = mock(() => delay("value", 5000));
      const r = resource(fetcher, { onError });

      r.fetch();
      await delay(10);
      r.abort();
      await delay(10);

      expect(onError).not.toHaveBeenCalled();
    });

    test("does not fire onError after reset", async () => {
      const onError = mock(() => {});
      const fetcher = mock(() => delay("value", 5));
      const r = resource(fetcher, { onError });

      r.fetch();
      for (let i = 0; i < 100; i++) {
        if (fetcher.mock.calls.length >= 1) break;
        await delay(10);
      }
      r.reset();
      await delay(10);

      expect(onError).not.toHaveBeenCalled();
    });
  });
});
