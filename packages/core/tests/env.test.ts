import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { hasWindow, hasDocument, hasNavigator } from "@hellajs/core";

describe("core", () => {
  describe("env", () => {
    let g: Record<string, unknown>;
    let windowDesc: PropertyDescriptor | undefined;
    let documentDesc: PropertyDescriptor | undefined;
    let navigatorDesc: PropertyDescriptor | undefined;

    beforeEach(() => {
      windowDesc = Object.getOwnPropertyDescriptor(globalThis, "window");
      documentDesc = Object.getOwnPropertyDescriptor(globalThis, "document");
      navigatorDesc = Object.getOwnPropertyDescriptor(globalThis, "navigator");
      g = globalThis as unknown as Record<string, unknown>;
    });

    afterEach(() => {
      if (windowDesc) Object.defineProperty(globalThis, "window", windowDesc);
      if (documentDesc) Object.defineProperty(globalThis, "document", documentDesc);
      if (navigatorDesc) Object.defineProperty(globalThis, "navigator", navigatorDesc);
    });

    test("hasWindow returns true in DOM environment", () => {
      expect(hasWindow()).toBe(true);
    });

    test("hasWindow returns false when window is absent", () => {
      delete g.window;
      expect(hasWindow()).toBe(false);
    });

    test("hasDocument returns true in DOM environment", () => {
      expect(hasDocument()).toBe(true);
    });

    test("hasDocument returns false when document is absent", () => {
      delete g.document;
      expect(hasDocument()).toBe(false);
    });

    test("hasNavigator returns true in DOM environment", () => {
      expect(hasNavigator()).toBe(true);
    });

    test("hasNavigator returns false when navigator is absent", () => {
      delete g.navigator;
      expect(hasNavigator()).toBe(false);
    });
  });
});
