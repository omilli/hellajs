import { describe, expect, test, mock } from 'bun:test';
import { computed, effect, signal } from '../dist/core';

/** Tests adopted with thanks from preact-signals implementation at
 * https://github.com/preactjs/signals/blob/main/packages/core/test/signal.test.tsx
 */

describe("topology", () => {
  test('optimizes complex dependency graphs', () => {
    //     A
    //   /   |
    //  B    | 
    //   \   |
    //     C
    //     |
    //     D

    const a = signal(2);
    const b = computed(() => a() - 1);
    const c = computed(() => a() + b());

    const renderMock = mock(() => "Display: " + c());
    const d = computed(renderMock);

    expect(d()).toBe("Display: 3");
    expect(renderMock).toHaveBeenCalled();
    renderMock.mockClear();

    a(4);
    d();
    expect(renderMock).toHaveBeenCalledTimes(1);
  });

  test('prevents duplicate renders in diamond pattern', () => {
    //     A
    //   /   \
    //  B     C
    //   \   /
    //     D

    const a = signal("John");
    const b = computed(() => a());
    const c = computed(() => a());

    const renderSpy = mock(() => b() + " " + c());
    const d = computed(renderSpy);

    expect(d()).toBe("John John");
    expect(renderSpy).toHaveBeenCalledTimes(1);

    a("Jane");
    expect(d()).toBe("Jane Jane");
    expect(renderSpy).toHaveBeenCalledTimes(2);
  });

  test('updates each signal only once in diamond with tail', () => {
    //     A
    //   /   \
    //  B     C
    //   \   /
    //     D
    //     |
    //     E

    const a = signal("a");
    const b = computed(() => a());
    const c = computed(() => a());

    const d = computed(() => b() + " " + c());

    const spy = mock(() => d());
    const e = computed(spy);

    expect(e()).toBe("a a");
    expect(spy).toHaveBeenCalledTimes(1);

    a("aa");
    expect(e()).toBe("aa aa");
    expect(spy).toHaveBeenCalledTimes(2);
  });

  test('skips updates when result stays the same', () => {
    // A->B->C
    const a = signal("a");
    const b = computed(() => {
      a();
      return "foo";
    });

    const spy = mock(() => b());
    const c = computed(spy);

    expect(c()).toBe("foo");
    expect(spy).toHaveBeenCalledTimes(1);

    a("aa");
    expect(c()).toBe("foo");
    expect(spy).toHaveBeenCalledTimes(1);
  });

  test('updates each signal only once in jagged diamond with tails', () => {
    //     A
    //   /   \
    //  B     C
    //  |     |
    //  |     D
    //   \   /
    //     E
    //   /   \
    //  F     G
    const a = signal("a");

    const b = computed(() => a());
    const c = computed(() => a());

    const d = computed(() => c());

    const eSpy = mock(() => b() + " " + d());
    const e = computed(eSpy);

    const fSpy = mock(() => e());
    const f = computed(fSpy);
    const gSpy = mock(() => e());
    const g = computed(gSpy);

    expect(f()).toBe("a a");
    expect(fSpy).toHaveBeenCalledTimes(1);

    expect(g()).toBe("a a");
    expect(gSpy).toHaveBeenCalledTimes(1);

    eSpy.mockClear();
    fSpy.mockClear();
    gSpy.mockClear();

    a("b");

    expect(e()).toBe("b b");
    expect(eSpy).toHaveBeenCalledTimes(1);

    expect(f()).toBe("b b");
    expect(fSpy).toHaveBeenCalledTimes(1);

    expect(g()).toBe("b b");
    expect(gSpy).toHaveBeenCalledTimes(1);

    eSpy.mockClear();
    fSpy.mockClear();
    gSpy.mockClear();

    a("c");

    expect(e()).toBe("c c");
    expect(eSpy).toHaveBeenCalledTimes(1);

    expect(f()).toBe("c c");
    expect(fSpy).toHaveBeenCalledTimes(1);

    expect(g()).toBe("c c");
    expect(gSpy).toHaveBeenCalledTimes(1);

    // Manual call order checks
    const eSpyCallOrder = eSpy.mock.calls.length > 0 ? eSpy.mock.invocationCallOrder[0] : -1;
    const fSpyCallOrder = fSpy.mock.calls.length > 0 ? fSpy.mock.invocationCallOrder[0] : -1;
    const gSpyCallOrder = gSpy.mock.calls.length > 0 ? gSpy.mock.invocationCallOrder[0] : -1;

    expect(eSpyCallOrder).toBeGreaterThan(-1);
    expect(fSpyCallOrder).toBeGreaterThan(-1);
    expect(gSpyCallOrder).toBeGreaterThan(-1);

    expect(eSpyCallOrder).toBeLessThan(fSpyCallOrder as number);
    expect(fSpyCallOrder).toBeLessThan(gSpyCallOrder as number);
  });

  test('only subscribes to observed signals', () => {
    //    *A
    //   /   \
    // *B     C
    const a = signal("a");

    const b = computed(() => a());
    const spy = mock(() => a());
    computed(spy);

    expect(b()).toBe("a");
    expect(spy).not.toHaveBeenCalled();

    a("aa");
    expect(b()).toBe("aa");
    expect(spy).not.toHaveBeenCalled();
  });

  test('unsubscribes from inactive signals', () => {
    //    *A
    //   /   \
    // *B     D
    //  |
    // *C
    const a = signal("a");
    const spyB = mock(() => a());
    const b = computed(spyB);

    const spyC = mock(() => b());
    const c = computed(spyC);

    const d = computed(() => a());

    let result = "";
    const unsub = effect(() => {
      result = c();
    });

    expect(result).toBe("a");
    expect(d()).toBe("a");

    spyB.mockClear();
    spyC.mockClear();
    unsub();

    a("aa");

    expect(spyB).not.toHaveBeenCalled();
    expect(spyC).not.toHaveBeenCalled();
    expect(d()).toBe("aa");
  });

  test('updates dependent even if one dependency skips', () => {
    //     A
    //   /   \
    //  B     *C
    //   \   /
    //     D
    const a = signal("a");
    const b = computed(() => a());
    const c = computed(() => {
      a();
      return "c";
    });
    const spy = mock(() => b() + " " + c());
    const d = computed(spy);

    expect(d()).toBe("a c");
    spy.mockClear();

    a("aa");
    expect(d()).toBe("aa c");
  });

  test('updates dependent even if multiple dependencies skip', () => {
    //     A
    //   / | \
    //  B *C *D
    //   \ | /
    //     E
    const a = signal("a");
    const b = computed(() => a());
    const c = computed(() => {
      a();
      return "c";
    });
    const d = computed(() => {
      a();
      return "d";
    });
    const spy = mock(() => b() + " " + c() + " " + d());
    const e = computed(spy);

    expect(e()).toBe("a c d");
    spy.mockClear();

    a("aa");
    e();
    expect(spy).toHaveBeenCalled();
    expect(e()).toBe("aa c d");
  });

  test('support lazy branches', () => {
    const a = signal(0);
    const b = computed(() => a());
    const c = computed(() => (a() > 0 ? a() : b()));

    expect(c()).toBe(0);
    a(1);
    expect(c()).toBe(1);

    a(0);
    expect(c()).toBe(0);
  });

  test('skips update when all dependencies skip', () => {
    //     A
    //   /   \
    // *B     *C
    //   \   /
    //     D
    const a = signal("a");
    const b = computed(() => {
      a();
      return "b";
    });
    const c = computed(() => {
      a();
      return "c";
    });
    const spy = mock(() => b() + " " + c());
    const d = computed(spy);

    expect(d()).toBe("b c");
    spy.mockClear();

    a("aa");
    expect(spy).not.toHaveBeenCalled();
  });
});
