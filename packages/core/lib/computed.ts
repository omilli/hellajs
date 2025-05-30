import { signal } from "./signal";
import { effect } from "./effect";
import { untracked } from "./untracked";
import type { ReadonlySignal } from "./types";

export function computed<T>(compute: () => T): ReadonlySignal<T> {
  const result = signal<T>(untracked(compute));
  let lastValue = result();

  effect(() => {
    const newValue = compute();
    if (!Object.is(lastValue, newValue)) {
      lastValue = newValue;
      result.set(newValue);
    }
  });

  const readonlySignal = (() => result()) as ReadonlySignal<T>;
  readonlySignal.cleanup = result.cleanup;
  readonlySignal.subscribe = result.subscribe;
  readonlySignal.unsubscribe = result.unsubscribe;

  return readonlySignal;
}