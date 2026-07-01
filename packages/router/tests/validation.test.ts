import { describe, test, expect, beforeEach } from "bun:test";
import { router, navigate, route } from "@hellajs/router/bundle";
import { setupRouterEnv } from "./helpers";

describe("router", () => {
  describe("validation", () => {
    beforeEach(() => {
      setupRouterEnv();
    });

    test("throws when config is null", () => {
      expect(() =>
        // @ts-expect-error - intentionally invalid: null config
        router(null)
      ).toThrow("[router] router: config must be an object");
    });

    test("throws when config is undefined", () => {
      expect(() =>
        // @ts-expect-error - intentionally invalid: undefined config
        router(undefined)
      ).toThrow("[router] router: config must be an object, received undefined");
    });

    test("throws when config is a non-object string", () => {
      expect(() =>
        // @ts-expect-error - intentionally invalid: string config
        router("routes")
      ).toThrow("[router] router: config must be an object");
    });

    test("throws when config is an array", () => {
      expect(() =>
        // @ts-expect-error - intentionally invalid: array config
        router([])
      ).toThrow("[router] router: config must be an object");
    });

    test("throws when navigate path is null", () => {
      expect(() =>
        // @ts-expect-error - intentionally invalid: null path
        navigate(null)
      ).toThrow("[router] navigate: path must be a string");
    });

    test("throws when navigate path is undefined", () => {
      expect(() =>
        // @ts-expect-error - intentionally invalid: undefined path
        navigate(undefined)
      ).toThrow("[router] navigate: path must be a string, received undefined");
    });

    test("throws when navigate path is a non-string number", () => {
      expect(() =>
        // @ts-expect-error - intentionally invalid: number path
        navigate(42)
      ).toThrow("[router] navigate: path must be a string, received number");
    });

    test("accepts a valid minimal config without throwing", () => {
      const info = router({ routes: {} });
      expect(info.handler).toBeNull();
      expect(typeof info.active).toBe("function");
    });

    test("navigates to a valid path without throwing", () => {
      router({ routes: { "/path": () => { } } });
      expect(() => navigate("/path")).not.toThrow();
      expect(route().path).toBe("/path");
    });
  });
});
