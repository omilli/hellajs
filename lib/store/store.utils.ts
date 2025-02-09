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
  toError(`Accessing undefined store property: ${String(prop)}`);
}
