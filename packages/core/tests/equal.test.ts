import { describe, it, expect } from 'bun:test';
import { deepEqual } from '../lib/equals';

describe('deepEqual', () => {
  it('should return true for identical references', () => {
    const obj = { a: 1 };
    const arr = [1, 2, 3];
    expect(deepEqual(obj, obj)).toBe(true);
    expect(deepEqual(arr, arr)).toBe(true);
    expect(deepEqual(5, 5)).toBe(true);
  });

  it('should handle primitive types correctly', () => {
    // Strings
    expect(deepEqual('hello', 'hello')).toBe(true);
    expect(deepEqual('hello', 'world')).toBe(false);

    // Numbers
    expect(deepEqual(42, 42)).toBe(true);
    expect(deepEqual(42, 43)).toBe(false);
    expect(deepEqual(NaN, NaN)).toBe(false); // NaN !== NaN

    // Booleans
    expect(deepEqual(true, true)).toBe(true);
    expect(deepEqual(false, false)).toBe(true);
    expect(deepEqual(true, false)).toBe(false);

    // Undefined
    expect(deepEqual(undefined, undefined)).toBe(true);
    expect(deepEqual(undefined, null)).toBe(false);

    // Symbol
    const sym1 = Symbol('test');
    const sym2 = Symbol('test');
    expect(deepEqual(sym1, sym1)).toBe(true);
    expect(deepEqual(sym1, sym2)).toBe(false);

    // BigInt
    expect(deepEqual(123n, 123n)).toBe(true);
    expect(deepEqual(123n, 456n)).toBe(false);
  });

  it('should handle null correctly', () => {
    expect(deepEqual(null, null)).toBe(true);
    expect(deepEqual(null, undefined)).toBe(false);
    expect(deepEqual(null, 0)).toBe(false);
    expect(deepEqual(null, {})).toBe(false);
  });

  it('should handle object vs non-object comparisons', () => {
    expect(deepEqual({}, 'string')).toBe(false);
    expect(deepEqual({}, 42)).toBe(false);
    expect(deepEqual({}, null)).toBe(false);
    expect(deepEqual('string', {})).toBe(false);
  });

  it('should handle Date objects', () => {
    const date1 = new Date('2025-01-01');
    const date2 = new Date('2025-01-01');
    const date3 = new Date('2025-01-02');

    expect(deepEqual(date1, date2)).toBe(true);
    expect(deepEqual(date1, date3)).toBe(false);
    expect(deepEqual(date1, {})).toBe(false);
    expect(deepEqual(date1, 'not a date')).toBe(false);
  });

  it('should handle RegExp objects', () => {
    const regex1 = /test/gi;
    const regex2 = /test/gi;
    const regex3 = /test/g;
    const regex4 = /different/gi;

    expect(deepEqual(regex1, regex2)).toBe(true);
    expect(deepEqual(regex1, regex3)).toBe(false); // Different flags
    expect(deepEqual(regex1, regex4)).toBe(false); // Different source
    expect(deepEqual(regex1, {})).toBe(false);
    expect(deepEqual(regex1, 'not a regex')).toBe(false);
  });

  it('should handle arrays', () => {
    expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true);
    expect(deepEqual([], [])).toBe(true);
    expect(deepEqual([1, 2, 3], [1, 2, 4])).toBe(false);
    expect(deepEqual([1, 2, 3], [1, 2])).toBe(false); // Different lengths
    expect(deepEqual([1, 2], [1, 2, 3])).toBe(false); // Different lengths
    expect(deepEqual([1, 2, 3], {})).toBe(false); // Array vs object
    expect(deepEqual({}, [1, 2, 3])).toBe(false); // Object vs array
  });

  it('should handle nested arrays', () => {
    expect(deepEqual([[1, 2], [3, 4]], [[1, 2], [3, 4]])).toBe(true);
    expect(deepEqual([[1, 2], [3, 4]], [[1, 2], [3, 5]])).toBe(false);
    expect(deepEqual([{ a: 1 }], [{ a: 1 }])).toBe(true);
    expect(deepEqual([{ a: 1 }], [{ a: 2 }])).toBe(false);
  });

  it('should handle Map objects', () => {
    const map1 = new Map([['a', 1], ['b', 2]]);
    const map2 = new Map([['a', 1], ['b', 2]]);
    const map3 = new Map([['a', 1], ['b', 3]]);
    const map4 = new Map([['a', 1]]);
    const map5 = new Map([['c', 1], ['d', 2]]);

    expect(deepEqual(map1, map2)).toBe(true);
    expect(deepEqual(map1, map3)).toBe(false); // Different values
    expect(deepEqual(map1, map4)).toBe(false); // Different sizes
    expect(deepEqual(map1, map5)).toBe(false); // Different keys
    expect(deepEqual(map1, {})).toBe(false); // Map vs object
    expect(deepEqual(new Map(), new Map())).toBe(true);
  });

  it('should handle nested Map values', () => {
    const map1 = new Map([['a', { x: 1 }]]);
    const map2 = new Map([['a', { x: 1 }]]);
    const map3 = new Map([['a', { x: 2 }]]);

    expect(deepEqual(map1, map2)).toBe(true);
    expect(deepEqual(map1, map3)).toBe(false);
  });

  it('should handle Set objects', () => {
    const set1 = new Set([1, 2, 3]);
    const set2 = new Set([1, 2, 3]);
    const set3 = new Set([1, 2, 4]);
    const set4 = new Set([1, 2]);

    expect(deepEqual(set1, set2)).toBe(true);
    expect(deepEqual(set1, set3)).toBe(false); // Different values
    expect(deepEqual(set1, set4)).toBe(false); // Different sizes
    expect(deepEqual(set1, {})).toBe(false); // Set vs object
    expect(deepEqual(new Set(), new Set())).toBe(true);
  });

  it('should handle plain objects', () => {
    expect(deepEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
    expect(deepEqual({}, {})).toBe(true);
    expect(deepEqual({ a: 1, b: 2 }, { a: 1, b: 3 })).toBe(false); // Different values
    expect(deepEqual({ a: 1, b: 2 }, { a: 1 })).toBe(false); // Different key count
    expect(deepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false); // Different key count
    expect(deepEqual({ a: 1, b: 2 }, { a: 1, c: 2 })).toBe(false); // Different keys
  });

  it('should handle nested objects', () => {
    expect(deepEqual({ a: { b: 1 } }, { a: { b: 1 } })).toBe(true);
    expect(deepEqual({ a: { b: 1 } }, { a: { b: 2 } })).toBe(false);
    expect(deepEqual({ a: [1, 2, 3] }, { a: [1, 2, 3] })).toBe(true);
    expect(deepEqual({ a: [1, 2, 3] }, { a: [1, 2, 4] })).toBe(false);
  });

  it('should handle objects with different constructors', () => {
    class CustomA {
      constructor(public value: number) {}
    }
    class CustomB {
      constructor(public value: number) {}
    }

    const objA = new CustomA(1);
    const objB = new CustomA(1);
    const objC = new CustomB(1);

    expect(deepEqual(objA, objB)).toBe(true);
    expect(deepEqual(objA, objC)).toBe(false); // Different constructors
  });

  it('should handle complex nested structures', () => {
    const complex1 = {
      arr: [1, 2, { nested: true }],
      map: new Map([['key', [1, 2, 3]]]),
      set: new Set([1, 2, 3]),
      date: new Date('2025-01-01'),
      regex: /test/g,
      obj: { a: 1, b: { c: 2 } }
    };

    const complex2 = {
      arr: [1, 2, { nested: true }],
      map: new Map([['key', [1, 2, 3]]]),
      set: new Set([1, 2, 3]),
      date: new Date('2025-01-01'),
      regex: /test/g,
      obj: { a: 1, b: { c: 2 } }
    };

    const complex3 = {
      arr: [1, 2, { nested: false }],
      map: new Map([['key', [1, 2, 3]]]),
      set: new Set([1, 2, 3]),
      date: new Date('2025-01-01'),
      regex: /test/g,
      obj: { a: 1, b: { c: 2 } }
    };

    expect(deepEqual(complex1, complex2)).toBe(true);
    expect(deepEqual(complex1, complex3)).toBe(false);
  });
});
