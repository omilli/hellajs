import { describe, it, expect, beforeEach } from 'bun:test';
import {
  effect,
  effectQueue,
  setCurrentEffect,
  getCurrentEffect,
  isFlushingEffect,
  setFlushingEffect,
  queueEffects,
  flushEffects,
} from '../effect';

describe('effect', () => {
  beforeEach(() => {
    effectQueue.clear();
    setCurrentEffect(null);
    setFlushingEffect(false);
  });

  it('should run the effect immediately', () => {
    let ran = false;
    effect(() => {
      ran = true;
    });
    expect(ran).toBe(true);
  });

  it('should allow effect cancellation', () => {
    let ran = 0;
    let savedEffect: (() => void) | null = null;
    const stop = effect(() => {
      ran++;
      savedEffect = getCurrentEffect();
    });
    expect(ran).toBe(1);
    stop();
    // Try to run the original effect again after cancellation
    if (savedEffect) (savedEffect as () => void)();
    expect(ran).toBe(1); // Should not increment after cancellation
  });

  it('should set and get current effect', () => {
    const fn = () => { };
    setCurrentEffect(fn);
    expect(getCurrentEffect()).toBe(fn);
    setCurrentEffect(null);
    expect(getCurrentEffect()).toBe(null);
  });

  it('should set and get flushing state', () => {
    setFlushingEffect(true);
    expect(isFlushingEffect()).toBe(true);
    setFlushingEffect(false);
    expect(isFlushingEffect()).toBe(false);
  });

  it('should queue and flush effects', async () => {
    let ran = 0;
    queueEffects([() => ran++]);
    expect(effectQueue.size).toBeGreaterThan(0);
    await flushEffects();
    expect(ran).toBe(1);
    expect(effectQueue.size).toBe(0);
  });

  it('should not flush effects if already flushing', () => {
    setFlushingEffect(true);
    let ran = 0;
    queueEffects([() => ran++]);
    // Should not flush immediately
    expect(ran).toBe(0);
    setFlushingEffect(false);
  });
});
