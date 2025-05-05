import { describe, it, expect } from 'bun:test';
import { resource } from '../resource';
import { effect, flushEffects } from '../effect';

describe('resource', () => {
  it('should initialize with initial value', () => {
    const r = resource(42);
    const state = r();
    expect(state.value).toBe(42);
    expect(state.loading).toBe(false);
    expect(state.error).toBe(null);
  });

  it('should update value synchronously with set', async () => {
    const r = resource(1);
    r.set(5);
    await flushEffects();
    expect(r().value).toBe(5);
    expect(r().loading).toBe(false);
    expect(r().error).toBe(null);
  });

  it('should track effects and notify on set', async () => {
    const r = resource(10);
    let effectRuns = 0;
    effect(() => {
      r();
      effectRuns++;
    });
    expect(effectRuns).toBe(1);
    r.set(20);
    await flushEffects();
    expect(effectRuns).toBe(2);
    expect(r().value).toBe(20);
  });

  it('should cleanup subscribers and reset state', () => {
    const r = resource(7);
    r.cleanup();
    expect(r().value).toBe(null);
    expect(r().loading).toBe(false);
    expect(r().error).toBe(null);
    // Should not throw on repeated cleanup
    expect(() => r.cleanup()).not.toThrow();
  });
});
