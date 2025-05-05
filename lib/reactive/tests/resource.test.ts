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

  it('should initialize with loading=true for async fetcher', () => {
    const r = resource(async () => 123);
    const state = r();
    expect(state.value).toBe(null);
    expect(state.loading).toBe(true);
    expect(state.error).toBe(null);
  });

  it('should resolve value and set loading=false after fetch', async () => {
    let resolve: (v: number) => void;
    const promise = new Promise<number>(r => { resolve = r; });
    const r = resource(() => promise);
    expect(r().loading).toBe(true);
    resolve!(99);
    await promise;
    await flushEffects();
    expect(r().value).toBe(99);
    expect(r().loading).toBe(false);
    expect(r().error).toBe(null);
  });

  it('should set error if fetcher rejects', async () => {
    const r = resource(() => Promise.reject(new Error('fail')));
    await flushEffects();
    // Wait for microtasks to settle
    await new Promise(res => setTimeout(res, 0));
    expect(r().loading).toBe(false);
    expect(r().error).toBeInstanceOf(Error);
    expect(String(r().error)).toMatch(/fail/);
  });

  it('should support refetch and update value', async () => {
    let value = 1;
    const r = resource(() => Promise.resolve(++value));
    await flushEffects();
    await new Promise(res => setTimeout(res, 0));
    expect(r().value).toBe(2);
    await r.refetch();
    await flushEffects();
    expect(r().value).toBe(3);
    expect(r().loading).toBe(false);
    expect(r().error).toBe(null);
  });
});
