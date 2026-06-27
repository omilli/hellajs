import { describe, test, expect, beforeEach, mock } from "bun:test";
import {delay} from "../../../utils/test-helpers.js";
import { resource, resourceCache } from "@hellajs/resource/bundle";

describe("resourceCache", () => {
  beforeEach(() => {
    resourceCache.map.clear();
    resourceCache.setConfig({ maxSize: 1000, enableLRU: true });
  });

  describe("isOnline", () => {
    test("returns navigator.onLine value", () => {
      // Default is typically true in happydom
      expect(typeof resourceCache.isOnline()).toBe("boolean");
    });
  });

  describe("onOnlineChange", () => {
    test("subscribes to online status changes", () => {
      const callback = mock(() => { });
      const unsubscribe = resourceCache.onOnlineChange(callback);

      // Dispatch online event
      window.dispatchEvent(new Event("online"));

      expect(callback).toHaveBeenCalledWith(true);

      unsubscribe();
    });

    test("subscribes to offline status changes", () => {
      const callback = mock(() => { });
      const unsubscribe = resourceCache.onOnlineChange(callback);

      // Dispatch offline event
      window.dispatchEvent(new Event("offline"));

      expect(callback).toHaveBeenCalledWith(false);

      unsubscribe();
    });

    test("unsubscribe removes callback", () => {
      const callback = mock(() => { });
      const unsubscribe = resourceCache.onOnlineChange(callback);

      unsubscribe();

      window.dispatchEvent(new Event("online"));

      expect(callback).not.toHaveBeenCalled();
    });

    test("multiple subscribers receive updates", () => {
      const callback1 = mock(() => { });
      const callback2 = mock(() => { });

      const unsub1 = resourceCache.onOnlineChange(callback1);
      const unsub2 = resourceCache.onOnlineChange(callback2);

      window.dispatchEvent(new Event("online"));

      expect(callback1).toHaveBeenCalledWith(true);
      expect(callback2).toHaveBeenCalledWith(true);

      unsub1();
      unsub2();
    });
  });

  describe("refetchOnReconnect", () => {
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
