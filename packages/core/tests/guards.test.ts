import { describe, test, expect } from "bun:test";
import { signal, computed, effect, isSignal, isComputed, isReactive } from '../';

describe("type guards", () => {
  test("isSignal identifies signals", () => {
    const s = signal(0);
    expect(isSignal(s)).toBe(true);
    expect(isComputed(s)).toBe(false);
    expect(isReactive(s)).toBe(true);
  });

  test("isComputed identifies computed", () => {
    const c = computed(() => 42);
    expect(isComputed(c)).toBe(true);
    expect(isSignal(c)).toBe(false);
    expect(isReactive(c)).toBe(true);
  });

  test("type guards reject non-reactive values", () => {
    const plainFn = () => 42;
    const plainValue = 42;
    const plainObject = { value: 42 };
    const nullValue = null;
    const undefinedValue = undefined;

    expect(isSignal(plainFn)).toBe(false);
    expect(isSignal(plainValue)).toBe(false);
    expect(isSignal(plainObject)).toBe(false);
    expect(isSignal(nullValue)).toBe(false);
    expect(isSignal(undefinedValue)).toBe(false);

    expect(isComputed(plainFn)).toBe(false);
    expect(isComputed(plainValue)).toBe(false);
    expect(isComputed(plainObject)).toBe(false);
    expect(isComputed(nullValue)).toBe(false);
    expect(isComputed(undefinedValue)).toBe(false);

    expect(isReactive(plainFn)).toBe(false);
    expect(isReactive(plainValue)).toBe(false);
    expect(isReactive(plainObject)).toBe(false);
    expect(isReactive(nullValue)).toBe(false);
    expect(isReactive(undefinedValue)).toBe(false);
  });

  test("type guards distinguish between signal and computed", () => {
    const s = signal(10);
    const c = computed(() => s() * 2);

    expect(isSignal(s)).toBe(true);
    expect(isSignal(c)).toBe(false);

    expect(isComputed(c)).toBe(true);
    expect(isComputed(s)).toBe(false);

    expect(isReactive(s)).toBe(true);
    expect(isReactive(c)).toBe(true);
  });

  test("type guards work with signal without initial value", () => {
    const s = signal<number>();
    expect(isSignal(s)).toBe(true);
    expect(isComputed(s)).toBe(false);
    expect(isReactive(s)).toBe(true);
  });

  test("type guards don't interfere with signal functionality", () => {
    const s = signal(5);
    expect(isSignal(s)).toBe(true);

    s(10);
    expect(s()).toBe(10);
    expect(isSignal(s)).toBe(true);
  });

  test("type guards don't interfere with computed functionality", () => {
    const s = signal(5);
    const c = computed(() => s() * 2);

    expect(isComputed(c)).toBe(true);
    expect(c()).toBe(10);

    s(20);
    expect(c()).toBe(40);
    expect(isComputed(c)).toBe(true);
  });

  test("type guards work with reactive dependencies", () => {
    const s = signal(3);
    const c = computed(() => s() + 1);
    let effectRan = 0;

    effect(() => {
      c();
      effectRan++;
    });

    expect(isSignal(s)).toBe(true);
    expect(isComputed(c)).toBe(true);
    expect(effectRan).toBe(1);

    s(5);
    expect(effectRan).toBe(2);
    expect(isSignal(s)).toBe(true);
    expect(isComputed(c)).toBe(true);
  });
});
