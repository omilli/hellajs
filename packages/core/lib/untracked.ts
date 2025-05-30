import { getCurrentEffect, setCurrentEffect } from "./effect";

export function untracked<T>(callback: () => T): T {
  const prevEffect = getCurrentEffect();

  setCurrentEffect(null);

  try {
    return callback();
  } finally {
    setCurrentEffect(prevEffect);
  }
}