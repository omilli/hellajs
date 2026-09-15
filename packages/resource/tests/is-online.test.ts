import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { resetTestState } from "@utils/test-helpers.js";
import { resourceCache } from "@hellajs/resource/bundle";

describe("resourceCache", () => {
  beforeEach(() => {
    resetTestState();
  });

  describe("isOnline", () => {
    // onlineStatus is module state resetTestState() does not cover — always leave the world online
    afterEach(() => {
      window.dispatchEvent(new Event("online"));
    });

    test("returns navigator.onLine value", () => {
      expect(resourceCache.isOnline()).toBe(navigator.onLine);
    });

    test("tracks online status changes from window events", () => {
      window.dispatchEvent(new Event("offline"));
      expect(resourceCache.isOnline()).toBe(false);

      window.dispatchEvent(new Event("online"));
      expect(resourceCache.isOnline()).toBe(true);
    });
  });
});
