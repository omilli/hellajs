import { describe, it, expect } from 'bun:test';
import { untracked } from '../untracked';
import { signal } from '../signal';
import { effect, setCurrentEffect, getCurrentEffect } from '../effect';

describe('untracked', () => {
  it('should read signal value without tracking', () => {
    const s = signal(1);
    let runs = 0;
    effect(() => {
      untracked(() => s());
      runs++;
    });
    s.set(2);
    expect(runs).toBe(1);
  });

  it('should restore previous effect context', () => {
    setCurrentEffect(() => { });
    const prev = getCurrentEffect();
    untracked(() => {
      expect(getCurrentEffect()).toBe(null);
    });
    expect(getCurrentEffect()).toBe(prev);
    setCurrentEffect(null);
  });

  it('should return the callback result', () => {
    const result = untracked(() => 123);
    expect(result).toBe(123);
  });

  it('should support nested untracked calls', () => {
    let outer = false, inner = false;
    untracked(() => {
      outer = getCurrentEffect() === null;
      untracked(() => {
        inner = getCurrentEffect() === null;
      });
    });
    expect(outer).toBe(true);
    expect(inner).toBe(true);
  });
});
