import { signal, Signal } from "../reactive";
import { HELLA_STORES } from "./store.global";
import { StoreBase, StoreSignals, StoreValidatedArgs } from "./store.types";
import { undefinedStoreProp } from "./store.utils";

const { stores } = HELLA_STORES;

export function storeSignal<T, V>({
  key,
  value,
  storeBase,
  storeProxy,
  options = {},
}: StoreValidatedArgs<T, V>): Signal<V> {
  const sig = signal(value);
  const storeData = stores.get(storeProxy);
  const isReadonlyKey = Array.isArray(options.readonly)
    ? options.readonly.includes(key as string)
    : options.readonly;

  return new Proxy(sig, {
    get: (target, prop) =>
      prop !== "set"
        ? target[prop as keyof Signal<V>]
        : (...args: [V]) => {
            if (storeBase.isDisposed)
              return console.warn(
                `Attempting to update a disposed store signal: ${String(key)}`
              );
            const isReadonlyExternal = isReadonlyKey && !storeBase.isInternal;
            if (isReadonlyExternal) {
              console.warn(
                `Cannot modify readonly store signal: ${String(key)}`
              );
              return;
            }
            target.set(args[0]);
            storeData?.store?.forEach((cb) => cb(key, args[0]));
          },
  });
}

export function storeProxy<T>(storeBase: StoreBase<T>): StoreSignals<T> {
  return new Proxy({} as StoreSignals<T>, {
    get: (_target, prop: string | symbol) => {
      const key = prop as keyof T;
      return key === "effect"
        ? storeBase.methods.get("effect" as keyof T)
        : storeBase.signals.get(key) ??
            storeBase.methods.get(key) ??
            undefinedStoreProp(prop);
    },
  });
}
