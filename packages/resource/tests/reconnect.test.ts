import { describe, test, expect, beforeEach, mock } from "bun:test";
import { delay, resetTestState } from "@utils/test-helpers.js";
import { resource } from "@hellajs/resource/bundle";

describe("resource", () => {
  describe("refetchOnReconnect", () => {
    beforeEach(() => {
      resetTestState();
    });

    test("refetches when coming back online", async () => {
      const fetcher = mock(() => delay(`data-${fetcher.mock.calls.length}`));
      const r = resource(fetcher, {
        refetchOnReconnect: true,
        refetchOnKeyChange: true
      });

      await delay(20);

      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(r.data()).toBe("data-1");

      // Simulate going online
      window.dispatchEvent(new Event("online"));

      await delay(20);

      expect(fetcher).toHaveBeenCalledTimes(2);
      expect(r.data()).toBe("data-2");

      r.dispose();
    });

    test("does not refetch when disabled", async () => {
      const fetcher = mock(() => delay(`data-${fetcher.mock.calls.length}`));
      const r = resource(fetcher, {
        refetchOnReconnect: false,
        refetchOnKeyChange: true
      });

      await delay(20);

      expect(fetcher).toHaveBeenCalledTimes(1);

      // Simulate going online
      window.dispatchEvent(new Event("online"));

      await delay(20);

      // Should not refetch
      expect(fetcher).toHaveBeenCalledTimes(1);

      r.dispose();
    });

    test("dispose cleans up reconnect listener", async () => {
      const fetcher = mock(() => delay(`data-${fetcher.mock.calls.length}`));
      const r = resource(fetcher, {
        refetchOnReconnect: true,
        refetchOnKeyChange: true
      });

      await delay(20);
      r.dispose();

      // Simulate going online after dispose
      window.dispatchEvent(new Event("online"));

      await delay(20);

      // Should not refetch after dispose
      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    test("works without refetchOnKeyChange (manual trigger + reconnect)", async () => {
      const fetcher = mock(() => delay(`data-${fetcher.mock.calls.length}`));
      const r = resource(fetcher, {
        refetchOnReconnect: true,
      });

      // No auto-fetch, must trigger manually
      await delay(20);
      expect(fetcher).toHaveBeenCalledTimes(0);

      // Manual fetch
      r.fetch({ force: true });
      await delay(20);
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(r.data()).toBe("data-1");

      // Reconnect triggers refetch
      window.dispatchEvent(new Event("online"));
      await delay(20);

      expect(fetcher).toHaveBeenCalledTimes(2);
      expect(r.data()).toBe("data-2");

      r.dispose();
    });
  });
});
