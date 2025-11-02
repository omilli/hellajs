import { describe, test, expect } from "bun:test";
import { signal } from '../dist/core';

function testSignal<T>(initialValue: T, newValue: T) {
  const testSignal = signal(initialValue);

  // Test creation and reading
  expect(testSignal()).toEqual(initialValue);

  // Test updating with new value
  testSignal(newValue);
  expect(testSignal()).toEqual(newValue);

  // Test updating with same value (should still work)
  testSignal(newValue);
  expect(testSignal()).toEqual(newValue);
}

describe("signal", () => {
  test("number", () => {
    testSignal(42, 100);
  });

  test("string", () => {
    testSignal("Alice", "Bob");
  });

  test("boolean", () => {
    testSignal(false, true);
  });

  test("object", () => {
    testSignal(
      { id: 1, name: "John" },
      { id: 2, name: "Jane" }
    );
  });

  test("null", () => {
    testSignal(null, "now has value");
  });

  test("undefined", () => {
    testSignal(undefined, "now has value");
  });

  test("array", () => {
    testSignal([1, 2, 3], [4, 5, 6]);
  });

  test("map", () => {
    const initialMap = new Map([['key1', 'value1'], ['key2', 'value2']]);
    const newMap = new Map([['key3', 'value3'], ['key4', 'value4']]);
    testSignal(initialMap, newMap);
  });

  test("set", () => {
    const initialSet = new Set([1, 2, 3]);
    const newSet = new Set([4, 5, 6]);
    testSignal(initialSet, newSet);
  });

  test("date", () => {
    testSignal(new Date('2023-01-01'), new Date('2024-01-01'));
  });

  test("regexp", () => {
    testSignal(/^test$/, /^hello$/i);
  });

  test("function", () => {
    testSignal(() => "initial", () => "updated");
  });

  test("bigint", () => {
    testSignal(123n, 456n);
  });

  test("symbol", () => {
    testSignal(Symbol('initial'), Symbol('updated'));
  });
});
