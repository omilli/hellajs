import { getCurrentComponent } from "../ui";
import { effect } from "./effect";
import type { Signal } from "./signal";
import { getCurrentEffect, effectQueue, isFlushingEffect, setFlushingEffect } from "./state";

export function computed<T>(getter: () => T): Signal<T> {
  let value: T;
  let isDirty = true;
  let subscribers: Set<() => void> | null = null;
  let cleanupEffect: (() => void) | null = null;

  const recompute = () => {
    const newValue = getter();
    if (!Object.is(value, newValue)) {
      value = newValue;
      if (subscribers) {
        const subs = Array.from(subscribers);
        for (let i = 0; i < subs.length; i++) {
          effectQueue.add(subs[i]);
        }
        subscribers.clear();
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
    }
    isDirty = false;
  };

  cleanupEffect = effect(() => {
    recompute();
  });

  const signalFn = () => {
    const currentEffect = getCurrentEffect();
    if (currentEffect) {
      if (!subscribers) subscribers = new Set();
      subscribers.add(currentEffect);
    }

    const currentComponent = getCurrentComponent();
    if (currentComponent) {
      currentComponent.signals.add(signalFn);
    }

    if (isDirty) {
      recompute();
    }
    return value;
  };

  signalFn.set = () => { };

  signalFn.cleanup = () => {
    if (cleanupEffect) {
      cleanupEffect();
      cleanupEffect = null;
    }
    subscribers?.clear();
    subscribers = null;
    isDirty = true;
  };

  return signalFn;
}