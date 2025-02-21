import { toError } from "../global";
import { StoreWithFnArgs } from "./store.types";

export function storeWithFn<T extends Record<string, any>>({
  storeBase,
  fn,
}: StoreWithFnArgs<T>): any {
  storeBase.isInternal = true;
  const result = fn();
  storeBase.isInternal = false;
  return result;
}

export function undefinedStoreProp(prop: string | symbol) {
  throw toError(`Accessing undefined store property: ${String(prop)}`);
}

export function readonlyStoreProp(prop: string | symbol | number) {
  throw toError(`Cannot modify readonly store property: ${String(prop)}`);
}
