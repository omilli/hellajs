import { toError } from "../global";
import { StoreWithFnArgs } from "./store.types";

export function storeWithFn<T extends Record<string, any>>({
  internalStore,
  fn,
}: StoreWithFnArgs<T>): any {
  internalStore.isInternal = true;
  const result = fn();
  internalStore.isInternal = false;
  return result;
}

export function undefinedStoreProp(prop: string | symbol) {
  toError(`Accessing undefined store property: ${String(prop)}`);
}
