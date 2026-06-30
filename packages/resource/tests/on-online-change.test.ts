import { describe, test, expect, beforeEach, mock } from "bun:test";
import { resetTestState } from "@utils/test-helpers.js";
import { resourceCache } from "@hellajs/resource/bundle";

describe("resourceCache", () => {
  beforeEach(() => {
    resetTestState();
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
});
