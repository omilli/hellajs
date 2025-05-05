import { describe, it, expect, beforeEach } from 'bun:test';
import { computed } from '../computed';
import { signal } from '../signal';
import { effect, effectQueue, setCurrentEffect, flushEffects } from '../effect';

describe('computed', () => {
  beforeEach(() => {
    effectQueue.clear();
    setCurrentEffect(null);
  });

  it('should create a computed signal with initial value', () => {
    const count = signal(1);
    const double = computed(() => count() * 2);
    expect(double()).toBe(2);
  });

  it('should recompute when dependencies change', async () => {
    const count = signal(2);
    const double = computed(() => count() * 2);
    expect(double()).toBe(4);

    count.set(3);
    await flushEffects();
    expect(double()).toBe(6);
  });

  it('should not recompute if dependencies do not change', async () => {
    const count = signal(5);
    let computeCount = 0;
    const double = computed(() => {
      computeCount++;
      return count() * 2;
    });

    expect(double()).toBe(10);
    expect(computeCount).toBe(1);

    // Setting to same value should not recompute
    count.set(5);
    await flushEffects();
    expect(double()).toBe(10);
    expect(computeCount).toBe(1);
  });

  it('should track effects that use the computed signal', async () => {
    const count = signal(1);
    const double = computed(() => count() * 2);
    let effectRan = 0;

    effect(() => {
      double();
      effectRan++;
    });

    expect(effectRan).toBe(1);

    count.set(2);
    await flushEffects();

    expect(effectRan).toBe(2);
  });

  it('should clean up subscribers', async () => {
    const count = signal(1);
    const double = computed(() => count() * 2);
    let effectRan = 0;

    effect(() => {
      double();
      effectRan++;
    });

    expect(effectRan).toBe(1);

    double.cleanup();
    count.set(3);
    await flushEffects();

    // Effect should not run again after cleanup
    expect(effectRan).toBe(1);
  });

  it('should clear subscribers after notifying them', async () => {
    const count = signal(1);
    const double = computed(() => count() * 2);
    let effectRan = 0;

    effect(() => {
      double();
      effectRan++;
    });

    count.set(2);
    await flushEffects();
    expect(effectRan).toBe(2);

    // Reset the effect queue
    effectQueue.clear();

    count.set(3);
    await flushEffects();
    expect(effectRan).toBe(3);
  });

  it('should allow multiple computed signals to depend on the same signal', async () => {
    const count = signal(2);
    const double = computed(() => count() * 2);
    const triple = computed(() => count() * 3);

    expect(double()).toBe(4);
    expect(triple()).toBe(6);

    count.set(3);
    await flushEffects();

    expect(double()).toBe(6);
    expect(triple()).toBe(9);
  });

  it('should support chained computed signals', async () => {
    const count = signal(2);
    const double = computed(() => count() * 2);
    const quadruple = computed(() => double() * 2);

    expect(quadruple()).toBe(8);

    count.set(3);
    await flushEffects();

    expect(quadruple()).toBe(12);
  });

  it('should not allow set on computed', () => {
    const count = signal(1);
    const double = computed(() => count() * 2);
    expect(() => double.set(10)).not.toThrow();
    expect(double()).toBe(2);
  });

  it('should reset value and state on cleanup', async () => {
    const count = signal(2);
    const double = computed(() => count() * 2);

    expect(double()).toBe(4);

    double.cleanup();

    // After cleanup, value should be undefined and dirty
    // Next access should recompute
    count.set(3);
    await flushEffects();
    expect(double()).toBe(6);
  });
});
