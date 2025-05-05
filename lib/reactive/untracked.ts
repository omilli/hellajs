import { getCurrentEffect, setCurrentEffect } from "./effect";

export function untracked<T>(callback: () => T | Promise<T>): Promise<T> {
  const prevEffect = getCurrentEffect();

  setCurrentEffect(null);

  try {
    const result = callback();
    if (result instanceof Promise) {
      return result;
    }
    return Promise.resolve(result);
  } finally {
    setCurrentEffect(prevEffect);
  }
}