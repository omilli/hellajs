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

export function effect(fn: () => void | Promise<void>): () => void {
  let isCancelled = false;
  let execute: (() => void) | null = async () => {
    if (isCancelled) return;
    setCurrentEffect(execute);
    try {
      const result = fn();
      if (result instanceof Promise) {
        await result;
      }
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