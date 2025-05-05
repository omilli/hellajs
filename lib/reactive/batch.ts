import { effectQueue, isFlushingEffect, setFlushingEffect } from "./effect";

export async function batch<T>(callback: () => T | Promise<T>): Promise<T> {
  const wasFlushing = isFlushingEffect();
  setFlushingEffect(true);

  try {
    const result = await Promise.resolve(callback());
    if (!wasFlushing) {
      await new Promise<void>((resolve) => {
        queueMicrotask(() => {
          const toRun = Array.from(effectQueue);
          effectQueue.clear();
          setFlushingEffect(false);
          for (const fn of toRun) fn();
          resolve();
        });
      });
    }
    return result;
  } catch (error) {
    if (!wasFlushing) {
      setFlushingEffect(false);
    }
    throw error;
  }
}