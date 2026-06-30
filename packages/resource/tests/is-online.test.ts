import { describe, test, expect, beforeEach } from "bun:test";
import { resetTestState } from "@utils/test-helpers.js";
import { resourceCache } from "@hellajs/resource/bundle";

describe("resourceCache", () => {
  beforeEach(() => {
    resetTestState();
  });

  describe("isOnline", () => {
    test("returns navigator.onLine value", () => {
      // Default is typically true in happydom
      expect(typeof resourceCache.isOnline()).toBe("boolean");
    });
  });
});
