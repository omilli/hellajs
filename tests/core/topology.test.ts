import { describe, expect, test, mock } from 'bun:test';
import { computed, effect, signal } from '../../packages/core';

/** Tests adopted with thanks from preact-signals implementation at
 * https://github.com/preactjs/signals/blob/main/packages/core/test/signal.test.tsx
 */

describe("topology", () => {
  test('optimize complex user dashboard calculations efficiently', () => {
    // Complex dependency graph like in a user dashboard:
    //     userScore (A)
    //   /           |
    //  level (B)    | 
    //   \           |
    //     display (C)
    //         |
    //    renderCount (D)

    const userScore = signal(2);
    const level = computed(() => userScore() - 1); // Level based on score
    const display = computed(() => userScore() + level()); // Combined display info

    const renderMock = mock(() => "Display: " + display());
    const renderCount = computed(renderMock);

    // Initial render
    expect(renderCount()).toBe("Display: 3");
    expect(renderMock).toHaveBeenCalled();
    renderMock.mockClear();

    // Score update should only trigger one render despite complex dependencies
    userScore(4);
    renderCount();
    expect(renderMock).toHaveBeenCalledTimes(1);
  });

  test('should prevent duplicate renders in shared data scenarios (diamond pattern)', () => {
    // Common scenario: user data feeding into multiple UI components
    // that then combine in a single display component
    //     userData
    //   /          \
    //  userProfile  userStats
    //   \          /
    //     combinedUI

    const userData = signal("John");
    const userProfile = computed(() => userData()); // Profile component
    const userStats = computed(() => userData()); // Stats component

    const renderSpy = mock(() => userProfile() + " " + userStats());
    const combinedUI = computed(renderSpy);

    expect(combinedUI()).toBe("John John");
    expect(renderSpy).toHaveBeenCalledTimes(1);

    // User data change should only trigger one combined UI update
    userData("Jane");
    expect(combinedUI()).toBe("Jane Jane");
    expect(renderSpy).toHaveBeenCalledTimes(2);
  });

  test('only update every signal once (diamond graph + tail)', () => {
    // "E" will be likely updated twice if our mark+sweep logic is buggy.
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

  test('bail out if result is the same', () => {
    // Bail out if value of "B" never changes
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

  test('only update every signal once (jagged diamond graph + tails)', () => {
    // "F" and "G" will be likely updated twice if our mark+sweep logic is buggy.
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

    // top to bottom
    // Manual call order checks
    const eSpyCallOrder = eSpy.mock.calls.length > 0 ? eSpy.mock.invocationCallOrder[0] : -1;
    const fSpyCallOrder = fSpy.mock.calls.length > 0 ? fSpy.mock.invocationCallOrder[0] : -1;
    const gSpyCallOrder = gSpy.mock.calls.length > 0 ? gSpy.mock.invocationCallOrder[0] : -1;

    expect(eSpyCallOrder).toBeGreaterThan(-1);
    expect(fSpyCallOrder).toBeGreaterThan(-1);
    expect(gSpyCallOrder).toBeGreaterThan(-1);

    // top to bottom
    expect(eSpyCallOrder).toBeLessThan(fSpyCallOrder as number);
    // left to right
    expect(fSpyCallOrder).toBeLessThan(gSpyCallOrder as number);
  });

  test('only subscribe to signals listened to', () => {
    //    *A
    //   /   \
    // *B     C <- we don't listen to C
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

  test('only subscribe to signals listened to II', () => {
    // Here both "B" and "C" are active in the beginning, but
    // "B" becomes inactive later. At that point test should
    // not receive any updates anymore.
    //    *A
    //   /   \
    // *B     D <- we don't listen to C
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

  test('ensure subs update even if one dep unmarks test', () => {
    // In this scenario "C" always returns the same value. When "A"
    // changes, "B" will update, then "C" at which point its update
    // to "D" will be unmarked. But "D" must still update because
    // "B" marked test. If "D" isn't updated, then we have a bug.
    //     A
    //   /   \
    //  B     *C <- returns same value every time
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

  test('ensure subs update even if two deps unmark test', () => {
    // In this scenario both "C" and "D" always return the same
    // value. But "E" must still update because "A" marked test.
    // If "E" isn't updated, then we have a bug.
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

  test('not update a sub if all deps unmark test', () => {
    // In this scenario "B" and "C" always return the same value. When "A"
    // changes, "D" should not update.
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

  test('keep graph consistent on errors during activation', () => {
    const a = signal(0);
    const b = computed(() => {
      throw new Error("fail");
    });
    const c = computed(() => a());

    expect(() => b()).toThrow("fail");

    a(1);
    expect(c()).toBe(1);
  });

  test('keeps graph consistent on errors in computeds', () => {
    const a = signal(0);
    const b = computed(() => {
      if (a() === 1) throw new Error("fail");
      return a();
    });
    const c = computed(() => b());

    expect(c()).toBe(0);

    a(1);
    expect(() => b()).toThrow("fail");

    a(2);
    expect(c()).toBe(2);
  });

});
