import { isFlushingEffect, setFlushingEffect, flushEffects } from "./effect";

export function batch<T>(callback: () => T): T {
  const wasFlushing = isFlushingEffect();
  setFlushingEffect(true);

  try {
    const result = callback();
    if (!wasFlushing) {
      flushEffects();
    }
    return result;
  } catch (error) {
    if (!wasFlushing) {
      setFlushingEffect(false);
    }
    throw error;
  }
}