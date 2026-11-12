// Based on the excellent https://github.com/stackblitz/alien-signals

export { signal } from "./signal";
export { signalArray } from "./signalArray";
export { signalMap } from "./signalMap";
export { signalSet } from "./signalSet";
export { computed } from "./computed";
export { effect } from "./effect";
export { untracked } from "./untracked";
export { scope } from "./scope";
export type * from "./types";

/* flush: scheduler drain + scheduled-error routing. Utils + env probes: shared kernel for sibling packages. */
export { flush, setFlushErrorHandler } from "./internal/scheduler";
export {
  isFunction,
  isPlainObject,
  isString,
  isNumber,
  isBoolean,
  isNull,
  isFalsy,
  isObject,
  objectLoop,
} from "./internal/utils";

export { hasWindow, hasDocument, hasNavigator } from "./internal/env";
