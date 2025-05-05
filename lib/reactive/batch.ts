import { isFlushingEffect, setFlushingEffect, flushEffects } from "./effect";

export async function batch<T>(callback: () => T | Promise<T>): Promise<T> {
  const wasFlushing = isFlushingEffect();
  setFlushingEffect(true);

  try {
    const result = await Promise.resolve(callback());
    if (!wasFlushing) {
      await flushEffects();
    }
    return result;
  } catch (error) {
    if (!wasFlushing) {
      setFlushingEffect(false);
    }
    throw error;
  }
}