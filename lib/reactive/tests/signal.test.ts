import { describe, it, expect, beforeEach } from 'bun:test';
import { signal } from '../signal';
import { setCurrentEffect, effectQueue, effect, flushEffects } from '../effect';

describe('signal', () => {
  beforeEach(() => {
    effectQueue.clear();
    setCurrentEffect(null);
  });

  it('should create a signal with initial value', () => {
    const count = signal(0);
    expect(count()).toBe(0);
  });

  it('should update signal value', () => {
    const count = signal(0);
    count.set(1);
    expect(count()).toBe(1);
  });

  it('should not update if value is the same', () => {
    const count = signal(0);
    const effectSpy = {
      fn: () => { }
    };

    // Manually track the signal
    setCurrentEffect(effectSpy.fn);
    count();
    setCurrentEffect(null);

    // Reset the effect queue
    effectQueue.clear();

    // Set the same value
    count.set(0);

    // No effects should have been queued
    expect(effectQueue.size).toBe(0);
  });

  it('should track effects that use the signal', async () => {
    const count = signal(0);
    let effectRan = 0;

    effect(() => {
      count(); // Read the signal value
      effectRan++;
    });

    expect(effectRan).toBe(1);

    count.set(1);
    await flushEffects();

    expect(effectRan).toBe(2);
  });

  it('should clean up subscribers', async () => {
    const count = signal(0);
    let effectRan = 0;

    effect(() => {
      count(); // Subscribe the effect
      effectRan++;
    });

    expect(effectRan).toBe(1);

    count.cleanup();
    count.set(1); // Should not trigger the effect
    await flushEffects();

    expect(effectRan).toBe(1); // Effect count should remain the same
  });

  it('should clear subscribers after notifying them', async () => {
    const count = signal(0);
    let effectRan = 0;

    effect(() => {
      count(); // Subscribe the effect
      effectRan++;
    });

    count.set(1); // Should notify the effect
    await flushEffects();

    expect(effectRan).toBe(2);

    // Reset the effect queue
    effectQueue.clear();

    count.set(2); // Signal should re-subscribe the effect
    await flushEffects();

    expect(effectRan).toBe(3);
  });
});
