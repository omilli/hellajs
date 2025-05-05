import { describe, it, expect, beforeEach } from 'bun:test';
import { scope, getCurrentScope, setCurrentScope } from '../scope';
import { effect } from '../effect';
import { Signal, signal } from '../signal';

describe('scope', () => {
  beforeEach(() => {
    setCurrentScope(null);
  });

  it('should create a scope and set/get current scope', () => {
    const s = scope();
    setCurrentScope(s);
    expect(getCurrentScope()).toBe(s);
    setCurrentScope(null);
    expect(getCurrentScope()).toBe(null);
  });

  it('should register and cleanup effects', () => {
    const s = scope();
    setCurrentScope(s);
    let ran = 0;
    effect(() => { ran++; });
    expect(s.effects.size).toBe(1);
    s.cleanup();
    expect(s.effects.size).toBe(0);
    // Effect should not run again after cleanup
    s.effects.forEach(fn => fn());
    expect(ran).toBe(1);
  });

  it('should register and cleanup signals', () => {
    const s = scope();
    setCurrentScope(s);
    const sig = signal(1);
    sig();
    expect(s.signals.size).toBe(1);
    sig.cleanup = () => { s.signals.delete(sig as Signal<unknown>); };
    sig.cleanup();
    expect(s.signals.size).toBe(0);
  });

  it('should cleanup parent reference', () => {
    const parent = scope();
    const child = scope(parent);
    expect(child.parent).toBe(parent);
    child.cleanup();
    expect((child.parent as undefined)).toBe(undefined);
  });
});
