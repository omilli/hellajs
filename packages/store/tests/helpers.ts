// Shared store test helpers.

import { mock } from "bun:test";

/**
 * Spies on a store's `$cleanup` method: captures the original, redefines it (store methods are
 * non-writable — `Object.defineProperty` with `configurable: true` keeps redefinition possible)
 * with a wrapper that fires the returned tracker, then forwards to the original.
 */
export const spyCleanup = (target: { $cleanup: () => void }) => {
  const original = target.$cleanup;
  const tracker = mock(() => {});
  Object.defineProperty(target, "$cleanup", {
    value: function (this: unknown) {
      tracker();
      original.call(this);
    },
    writable: false,
    enumerable: true,
    configurable: true
  });
  return tracker;
};

/**
 * Runs `fn` with `globalThis.window` deleted (SSR simulation), restoring it afterwards.
 */
export const withoutWindow = <T>(fn: () => T): T => {
  const win = globalThis.window;
  Reflect.deleteProperty(globalThis, "window");
  try {
    return fn();
  } finally {
    globalThis.window = win;
  }
};
