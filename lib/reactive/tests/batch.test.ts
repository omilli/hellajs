import { describe, it, expect } from 'bun:test';
import { batch } from '../batch';
import { signal } from '../signal';
import { effect, flushEffects, isFlushingEffect } from '../effect';

describe('batch', () => {
  it('should batch multiple signal updates and flush effects once', async () => {
    const a = signal(1);
    const b = signal(2);
    let runs = 0;
    effect(() => {
      a();
      b();
      runs++;
    });
    expect(runs).toBe(1);

    batch(() => {
      a.set(3);
      b.set(4);
      expect(isFlushingEffect()).toBe(true);
      // Effect should not run yet
      expect(runs).toBe(1);
    });

    // Effect should have run after batch
    await flushEffects();
    expect(runs).toBe(2);
  });

  it('should return the callback result', () => {
    const result = batch(() => 42);
    expect(result).toBe(42);
  });

  it('should throw and reset flushing if callback throws', () => {
    expect(() => {
      batch(() => {
        throw new Error('fail');
      });
    }).toThrow('fail');
    expect(isFlushingEffect()).toBe(false);
  });

  it('should support nested batches', async () => {
    const s = signal(0);
    let runs = 0;
    effect(() => {
      s();
      runs++;
    });
    expect(runs).toBe(1);

    batch(() => {
      s.set(1);
      batch(() => {
        s.set(2);
      });
      // Still not flushed
      expect(runs).toBe(1);
    });

    await flushEffects();
    expect(runs).toBe(2);
  });
});
