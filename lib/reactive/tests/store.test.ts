import { describe, it, expect } from 'bun:test';
import { store } from '../store';

describe('store', () => {
  it('should create a store with signals for each property', () => {
    const s = store({ a: 1, b: 2 });
    expect(typeof s.a).toBe('function');
    expect(typeof s.b).toBe('function');
    expect(s.a()).toBe(1);
    expect(s.b()).toBe(2);
  });

  it('should update values with $set', () => {
    const s = store({ a: 1, b: 2 });
    s.$set({ a: 10, b: 20 });
    expect(s.a()).toBe(10);
    expect(s.b()).toBe(20);
  });

  it('should update values with $update', () => {
    const s = store({ a: 1, b: 2 });
    s.$update({ a: 5 });
    expect(s.a()).toBe(5);
    expect(s.b()).toBe(2);
    s.$update({ b: 7 });
    expect(s.b()).toBe(7);
  });

  it('should not update if $update value is undefined', () => {
    const s = store({ a: 1, b: 2 });
    s.$update({ a: undefined });
    expect(s.a()).toBe(1);
  });

  it('should return computed object with $computed', () => {
    const s = store({ a: 1, b: 2 });
    expect(s.$computed()).toEqual({ a: 1, b: 2 });
    s.a.set(42);
    expect(s.$computed()).toEqual({ a: 42, b: 2 });
  });

  it('should support nested stores', () => {
    const s = store({ a: 1, nested: { b: 2, c: 3 } });
    expect(typeof s.nested).toBe('object');
    expect(typeof s.nested.b).toBe('function');
    expect(s.nested.b()).toBe(2);
    expect(s.nested.c()).toBe(3);
    s.nested.b.set(10);
    expect(s.nested.b()).toBe(10);
  });

  it('should update nested values with $set', () => {
    const s = store({ a: 1, nested: { b: 2, c: 3 } });
    s.$set({ a: 5, nested: { b: 6, c: 7 } });
    expect(s.a()).toBe(5);
    expect(s.nested.b()).toBe(6);
    expect(s.nested.c()).toBe(7);
  });

  it('should update nested values with $update', () => {
    const s = store({ a: 1, nested: { b: 2, c: 3 } });
    s.$update({ nested: { b: 9 } });
    expect(s.nested.b()).toBe(9);
    expect(s.nested.c()).toBe(3);
  });

  it('should cleanup signals and restore previous scope on $cleanup', () => {
    const s = store({ a: 1, b: 2 });
    s.$cleanup();
    // After cleanup, signals should be cleared and not throw on access
    expect(() => s.a()).not.toThrow();
    expect(() => s.b()).not.toThrow();
  });

  it('should cleanup nested stores', () => {
    const s = store({ a: 1, nested: { b: 2 } });
    s.$cleanup();
    expect(() => s.nested.b()).not.toThrow();
  });
});
