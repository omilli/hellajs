import { isFunction } from "../global";
import { batchSignals } from "../reactive";
import { StoreInternals, StoreSignals, StoreUpdateArgs } from "./store.types";

export function updateStore<T extends Record<string, any>>({
  internalStore,
  signals,
  update,
}: StoreUpdateArgs<T>) {
  internalStore.isDisposed &&
    console.warn("Attempting to update a disposed store");
  const updates = isFunction(update)
    ? update(Object.fromEntries(signals) as unknown as StoreSignals<T>)
    : update;

  batchSignals(() => {
    for (const [key, value] of Object.entries(updates)) {
      signals.get(key as keyof T)?.set(value);
    }
  });
}

export function destroyStore<T>(internalStore: StoreInternals<T>): void {
  internalStore.isDisposed = true;
  internalStore.signals.forEach((signal) => signal.dispose?.());
  internalStore.effects.clear();
  internalStore.signals.clear();
  internalStore.methods.clear();
}
