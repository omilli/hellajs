import { describe, expect, test } from 'bun:test';

describe('scope', () => {
  test('collects and disposes effects in scope', () => {
    const count = signal(0);
    let runs = 0;

    const dispose = scope(() => {
      effect(() => {
        count();
        runs++;
      });
    });

    expect(runs).toBe(1);
    count(1);
    expect(runs).toBe(2);

    dispose();
    count(2);
    expect(runs).toBe(2); // Should not run after dispose
  });

  test('disposes multiple effects in scope', () => {
    const count = signal(0);
    let runs1 = 0;
    let runs2 = 0;

    const dispose = scope(() => {
      effect(() => {
        count();
        runs1++;
      });
      effect(() => {
        count();
        runs2++;
      });
    });

    expect(runs1).toBe(1);
    expect(runs2).toBe(1);

    count(1);
    expect(runs1).toBe(2);
    expect(runs2).toBe(2);

    dispose();
    count(2);
    expect(runs1).toBe(2);
    expect(runs2).toBe(2);
  });

  test('supports nested scopes with independent cleanup', () => {
    const count = signal(0);
    let outerRuns = 0;
    let innerRuns = 0;

    const disposeOuter = scope(() => {
      effect(() => {
        count();
        outerRuns++;
      });

      const disposeInner = scope(() => {
        effect(() => {
          count();
          innerRuns++;
        });
      });

      // Inner scope can be disposed independently
      expect(innerRuns).toBe(1);
      count(1);
      expect(innerRuns).toBe(2);

      disposeInner();
      count(2);
      expect(innerRuns).toBe(2); // Stopped
      expect(outerRuns).toBe(3); // Still running
    });

    disposeOuter();
    count(3);
    expect(outerRuns).toBe(3);
    expect(innerRuns).toBe(2);
  });

  test('scope with no effects returns noop cleanup', () => {
    const dispose = scope(() => {
      // No effects created
    });

    expect(() => dispose()).not.toThrow();
  });

  test('effects outside scope work independently', () => {
    const count = signal(0);
    let scopedRuns = 0;
    let unscopedRuns = 0;

    // Effect outside scope
    const cleanupUnscoped = effect(() => {
      count();
      unscopedRuns++;
    });

    const disposeScope = scope(() => {
      effect(() => {
        count();
        scopedRuns++;
      });
    });

    expect(scopedRuns).toBe(1);
    expect(unscopedRuns).toBe(1);

    count(1);
    expect(scopedRuns).toBe(2);
    expect(unscopedRuns).toBe(2);

    // Dispose scope only
    disposeScope();
    count(2);
    expect(scopedRuns).toBe(2); // Stopped
    expect(unscopedRuns).toBe(3); // Still running

    cleanupUnscoped();
  });

  test('scope only affects effects, not signals or computed', () => {
    const count = signal(0);
    let effectRuns = 0;

    const dispose = scope(() => {
      const doubled = computed(() => count() * 2);

      effect(() => {
        doubled();
        effectRuns++;
      });

      expect(doubled()).toBe(0);
    });

    expect(effectRuns).toBe(1);

    dispose();
    count(1);

    // Effect stopped but computed still works
    expect(effectRuns).toBe(1);
  });

  test('calling dispose multiple times is safe', () => {
    const count = signal(0);
    let runs = 0;

    const dispose = scope(() => {
      effect(() => {
        count();
        runs++;
      });
    });

    expect(runs).toBe(1);

    dispose();
    dispose(); // Should not throw
    dispose(); // Should not throw

    count(1);
    expect(runs).toBe(1);
  });

  test('scope works with batched effects', () => {
    const a = signal(0);
    const b = signal(0);
    let runs = 0;

    const dispose = scope(() => {
      effect(() => {
        a();
        b();
        runs++;
      });
    });

    expect(runs).toBe(1);

    batch(() => {
      a(1);
      b(1);
    });

    expect(runs).toBe(2);

    dispose();

    batch(() => {
      a(2);
      b(2);
    });

    expect(runs).toBe(2);
  });

  test('scope collects nested effects', () => {
    const trigger = signal(0);
    let outerRuns = 0;
    let innerRuns = 0;

    const dispose = scope(() => {
      effect(() => {
        trigger();
        outerRuns++;

        effect(() => {
          innerRuns++;
        });
      });
    });

    expect(outerRuns).toBe(1);
    expect(innerRuns).toBe(1);

    trigger(1);
    expect(outerRuns).toBe(2);
    expect(innerRuns).toBe(2);

    dispose();
    trigger(2);
    expect(outerRuns).toBe(2);
    expect(innerRuns).toBe(2);
  });
});
