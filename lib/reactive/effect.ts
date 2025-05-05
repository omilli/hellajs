import { getCurrentScope } from "./scope";

export const effectQueue: Set<() => void> = new Set();

let currentEffect: (() => void) | null = null;

let isFlushing = false;

export const getCurrentEffect = () => currentEffect;

export function setCurrentEffect(effect: (() => void) | null): void {
  currentEffect = effect;
}

export const isFlushingEffect = () => isFlushing;

export function setFlushingEffect(flushing: boolean): void {
  isFlushing = flushing;
}

export function queueEffects(effects: Iterable<() => void>): void {
  for (const fn of effects) {
    effectQueue.add(fn);
  }

  if (!isFlushingEffect()) {
    setFlushingEffect(true);
    queueMicrotask(() => {
      const toRun = Array.from(effectQueue);
      effectQueue.clear();
      setFlushingEffect(false);
      for (const fn of toRun) fn();
    });
  }
}

export function flushEffects(): Promise<void> {
  return new Promise<void>((resolve) => {
    queueMicrotask(() => {
      const toRun = Array.from(effectQueue);
      effectQueue.clear();
      setFlushingEffect(false);
      for (const fn of toRun) fn();
      resolve();
    });
  });
}

export function effect(fn: () => void): () => void {
  let isCancelled = false;
  let execute: (() => void) | null = () => {
    if (isCancelled) return;
    setCurrentEffect(execute);
    try {
      fn();
    } finally {
      setCurrentEffect(null);
    }
  };

  execute();

  const currentScope = getCurrentScope();

  if (currentScope) {
    currentScope.effects.add(() => {
      isCancelled = true;
      execute = null;
    });
  }

  return () => {
    isCancelled = true;
    execute = null;
  };
}