// Based on the excellent https://github.com/stackblitz/alien-signals

export { signal } from './signal';
export { computed } from './computed';
export { effect } from './effect';
export { batch } from './batch';
export { untracked } from './untracked';
export { scope } from './scope';
export type * from "./types";

/* Internal exports for testing and advanced use cases */
export { flush } from './internal/scheduler';
export {
  isFunction,
  isPlainObject,
  isString,
  isUndefined,
  isFalsy,
  objectLoop
} from './internal/utils';