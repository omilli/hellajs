import { effectQueue, isFlushingEffect, setFlushingEffect } from "./state";

export function batch<T>(callback: () => T): T {
  const wasFlushing = isFlushingEffect();

  setFlushingEffect(true);

  try {
    const result = callback();

    if (!wasFlushing) {
      queueMicrotask(() => {
        const toRun = Array.from(effectQueue);
        effectQueue.clear();
        setFlushingEffect(false);
        for (const fn of toRun) fn();
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