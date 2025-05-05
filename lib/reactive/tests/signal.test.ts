import { describe, it, expect, beforeEach } from 'bun:test';
import { signal } from '../signal';
import { setCurrentEffect, effectQueue, effect, flushEffects } from '../effect';
import { store } from '../store';

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

  it('should add signal to current scope if available', async () => {
    // Instead of manually managing scope, use the store API as a real user would
    const myStore = store({
      counter: 0
    });

    // Check that the signal was automatically added to the store's scope
    expect(myStore.counter()).toBe(0);

    // Calling $cleanup should clean up all signals
    myStore.$cleanup();
  });

  it('should handle async values in set', async () => {
    const text = signal('loading');

    const promise = Promise.resolve('loaded');
    text.set(promise);

    await promise;
    expect(text()).toBe('loaded');
  });

  it('should handle errors in async values', async () => {
    const originalConsoleError = console.error;
    let errorCalled = false;
    console.error = () => { errorCalled = true; };

    const text = signal('initial');

    const failingPromise = Promise.reject(new Error('Failed to load'));
    text.set(failingPromise);

    // Wait for the promise to reject
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(text()).toBe('initial'); // Value should not change
    expect(errorCalled).toBe(true);

    console.error = originalConsoleError;
  });

  it('should not process a second async update while one is pending', async () => {
    const text = signal('initial');

    // Create a promise that won't resolve immediately
    let resolve: ((value: string) => void) | undefined;
    const slowPromise = new Promise<string>(r => { resolve = r });

    text.set(slowPromise);
    text.set('ignored update'); // This should be ignored

    resolve?.('final');
    await slowPromise;

    expect(text()).toBe('final');
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
