import { isFunction } from "../global";
import { batchSignals } from "../reactive";
import { StoreBase, StoreSignals, StoreUpdateArgs } from "./store.types";

export function updateStore<T extends Record<string, any>>({
  storeBase,
  signals,
  update,
}: StoreUpdateArgs<T>) {
  storeBase.isDisposed && console.warn("Attempting to update a disposed store");
  const updates = isFunction(update)
    ? update(Object.fromEntries(signals) as unknown as StoreSignals<T>)
    : update;

  batchSignals(() => {
    for (const [key, value] of Object.entries(updates)) {
      signals.get(key as keyof T)?.set(value);
    }
  });
}

export function destroyStore<T>(storeBase: StoreBase<T>): void {
  storeBase.isDisposed = true;
  storeBase.signals.forEach((signal) => signal.dispose?.());
  storeBase.effects.clear();
  storeBase.signals.clear();
  storeBase.methods.clear();
}
