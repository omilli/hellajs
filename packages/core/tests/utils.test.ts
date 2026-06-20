import { describe, expect, test, afterEach, mock } from "bun:test";
import {
  isFunction, isPlainObject, isString, isUndefined, isFalsy, isObject,
  objectLoop, hasWindow, hasDocument, hasNavigator
} from "@hellajs/core";

describe("core", () => {
  describe("utils", () => {
    test("isFunction returns true for function declarations, arrow functions, and class constructors", () => {
      expect(isFunction(function () { })).toBe(true);
      expect(isFunction(() => { })).toBe(true);
      expect(isFunction(class Foo { })).toBe(true);
    });

    test("isFunction returns false for non-function values", () => {
      expect(isFunction({})).toBe(false);
      expect(isFunction(42)).toBe(false);
      expect(isFunction("hello")).toBe(false);
      expect(isFunction(null)).toBe(false);
      expect(isFunction(undefined)).toBe(false);
    });

    test("isFunction type-narrows to callable type", () => {
      const val: unknown = () => 42;
      if (isFunction(val)) {
        const fn: (...args: unknown[]) => unknown = val;
        expect(fn()).toBe(42);
      }
    });

    test("isString returns true for string literals", () => {
      expect(isString("hello")).toBe(true);
      expect(isString("")).toBe(true);
    });

    test("isString returns false for non-string values including String objects", () => {
      expect(isString(42)).toBe(false);
      expect(isString(null)).toBe(false);
      expect(isString(undefined)).toBe(false);
      expect(isString(new String("hello"))).toBe(false);
    });

    test("isUndefined returns true only for undefined", () => {
      expect(isUndefined(undefined)).toBe(true);
      expect(isUndefined(null)).toBe(false);
      expect(isUndefined(0)).toBe(false);
      expect(isUndefined("")).toBe(false);
    });

    test("isFalsy returns true for false, null, and undefined per narrow contract", () => {
      expect(isFalsy(false)).toBe(true);
      expect(isFalsy(null)).toBe(true);
      expect(isFalsy(undefined)).toBe(true);
    });

    test("isFalsy returns false for 0, empty string, and NaN", () => {
      expect(isFalsy(0)).toBe(false);
      expect(isFalsy("")).toBe(false);
      expect(isFalsy(NaN)).toBe(false);
      expect(isFalsy(true)).toBe(false);
      expect(isFalsy({})).toBe(false);
    });

    test("isObject returns true for objects, arrays, and Date", () => {
      expect(isObject({})).toBe(true);
      expect(isObject([])).toBe(true);
      expect(isObject(new Date())).toBe(true);
    });

    test("isObject returns false for null and primitives", () => {
      expect(isObject(null)).toBe(false);
      expect(isObject(42)).toBe(false);
      expect(isObject("hello")).toBe(false);
      expect(isObject(undefined)).toBe(false);
      expect(isObject(true)).toBe(false);
    });

    test("isPlainObject returns true for plain object literal", () => {
      expect(isPlainObject({})).toBe(true);
      expect(isPlainObject({ a: 1, b: 2 })).toBe(true);
    });

    test("isPlainObject returns true for Object.create(null)", () => {
      expect(isPlainObject(Object.create(null))).toBe(true);
    });

    test("isPlainObject returns false for arrays", () => {
      expect(isPlainObject([])).toBe(false);
    });

    test("isPlainObject returns false for Date instances", () => {
      expect(isPlainObject(new Date())).toBe(false);
    });

    test("isPlainObject returns false for class instances", () => {
      class Foo { }
      expect(isPlainObject(new Foo())).toBe(false);
    });

    test("isPlainObject returns false for null", () => {
      expect(isPlainObject(null)).toBe(false);
    });

    test("isPlainObject returns false for Map and Set", () => {
      expect(isPlainObject(new Map())).toBe(false);
      expect(isPlainObject(new Set())).toBe(false);
    });

    test("objectLoop iterates all own keys with correct values", () => {
      const obj = { a: 1, b: "hello", c: true };
      const entries: Array<[string, unknown]> = [];
      objectLoop(obj, (key, value) => {
        entries.push([key, value]);
      });
      expect(entries).toEqual([["a", 1], ["b", "hello"], ["c", true]]);
    });

    test("objectLoop is no-op for undefined input", () => {
      const fn = mock(() => { });
      objectLoop(undefined, fn);
      expect(fn).not.toHaveBeenCalled();
    });

    test("objectLoop iterates zero times for empty object", () => {
      const fn = mock(() => { });
      objectLoop({}, fn);
      expect(fn).not.toHaveBeenCalled();
    });

    test("objectLoop callback receives string keys", () => {
      const obj = { key: "value" };
      objectLoop(obj, (key, value) => {
        expect(typeof key).toBe("string");
        expect(value).toBe("value");
      });
    });
  });

  describe("env", () => {
    const windowDesc = Object.getOwnPropertyDescriptor(globalThis, "window");
    const documentDesc = Object.getOwnPropertyDescriptor(globalThis, "document");
    const navigatorDesc = Object.getOwnPropertyDescriptor(globalThis, "navigator");
    const g = globalThis as unknown as Record<string, unknown>;

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
