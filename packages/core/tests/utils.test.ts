import { describe, expect, test, mock } from "bun:test";
import {
  isFunction, isPlainObject, isString, isNumber, isBoolean, isNull, isFalsy, isObject,
  objectLoop
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

    test("isNumber returns true for numbers including NaN, false for lookalikes", () => {
      expect(isNumber(42)).toBe(true);
      expect(isNumber(3.14)).toBe(true);
      expect(isNumber(NaN)).toBe(true);
      expect(isNumber("1")).toBe(false);
      expect(isNumber(null)).toBe(false);
      expect(isNumber(undefined)).toBe(false);
    });

    test("isBoolean returns true for true and false, false for truthy lookalikes", () => {
      expect(isBoolean(true)).toBe(true);
      expect(isBoolean(false)).toBe(true);
      expect(isBoolean(0)).toBe(false);
      expect(isBoolean("true")).toBe(false);
      expect(isBoolean(null)).toBe(false);
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

    test("isNull returns true for null only, false for other falsy values", () => {
      expect(isNull(null)).toBe(true);
      expect(isNull(undefined)).toBe(false);
      expect(isNull(0)).toBe(false);
      expect(isNull(false)).toBe(false);
      expect(isNull("")).toBe(false);
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
});
