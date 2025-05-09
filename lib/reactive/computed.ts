import { signal } from "./signal";
import { effect } from "./effect";
import { untracked } from "./untracked";

export function computed<T>(compute: () => T) {
  const result = signal<T>(untracked(compute));
  let lastValue = result();

  effect(() => {
    const newValue = compute();
    if (!Object.is(lastValue, newValue)) {
      lastValue = newValue;
      result.set(newValue);
    }
  });

  return result;
}