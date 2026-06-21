import { signal, computed, isFunction, isPlainObject } from "./internal/core";
import type { Store, PartialDeep, StoreOptions, StoreMiddleware } from "./types";
import { deepClone, extractChanges } from "./draft";
import {
  reservedKeys,
  isObject,
  isObjectOrFunction,
  isStore,
  applyUpdate,
  wrapWithMiddleware,
  defineStoreProperty
} from "./utils";

/**
 * @internal
 * Internal factory that creates a reactive store from an initial object.
 *
 * Recursively transforms properties:
 * - Functions: preserved as-is
 * - Plain objects: recursively create nested stores
 * - Primitives/arrays: wrapped in signals (computed if readonly)
 *
 * @template T
 * @param initial Initial object to transform
 * @param options Configuration for readonly properties and middleware
 * @returns Reactive store with snapshot, update, and cleanup methods
 */
export function createStore<T extends Record<string, unknown>>(
  initial: T,
  options?: StoreOptions<T>
): Store<T, never> {
  const readonlyAll = options?.readonly === true;
  const readonlyKeys = Array.isArray(options?.readonly) ? options.readonly : [];
  const middlewares = options?.middleware;

  const result = {} as Store<T, never>;

  const snapshotComputed = computed(() => {
    const snapshotObj = {} as T;
    const resultKeys = Object.keys(result);
    let i = 0;
    const len = resultKeys.length;
    while (i < len) {
      const key = resultKeys[i]!;
      if (reservedKeys.has(key)) { i++; continue; }
      const value = result[key as keyof T];
      const originalValue = initial[key as keyof T];

      if (isFunction(originalValue)) {
        snapshotObj[key as keyof T] = originalValue;
      } else if (isObject(value) && Object.hasOwn(value, "snapshot") && isFunction((value as Record<"snapshot", unknown>).snapshot)) {
        snapshotObj[key as keyof T] = ((value as Record<"snapshot", unknown>).snapshot as () => T[keyof T])();
      } else if (isFunction(value)) {
        snapshotObj[key as keyof T] = (value as () => T[keyof T])();
      }
      i++;
    }
    return snapshotObj;
  });

  result.snapshot = snapshotComputed;

  result.update = function (partial: PartialDeep<T> | ((draft: T) => void)) {
    let resolvedPartial: PartialDeep<T>;

    if (isFunction(partial)) {
      const snapshot = this.snapshot();
      const draft = deepClone(snapshot);
      (partial as (draft: T) => void)(draft);
      resolvedPartial = extractChanges(snapshot, draft) as PartialDeep<T>;
    } else {
      resolvedPartial = partial as PartialDeep<T>;
    }

    const entries = Object.entries(resolvedPartial as Record<string, unknown>);
    let i = 0;
    const len = entries.length;
    while (i < len) {
      const [key, value] = entries[i]!;
      const current = this[key as keyof T];
      if (isPlainObject(value) && current && isObject(current) && Object.hasOwn(current, "update")) {
        (current as unknown as Store<Record<string, unknown>>).update(value as object);
      } else {
        applyUpdate(current, value, middlewares, key as string);
      }
      i++;
    }
  };

  /**
   * Internal recursive teardown that walks the store tree disposing all nested stores.
   * Individual signals are not disposed — they remain functional. Only the store structure is torn down.
   */
  result.cleanup = function () {
    const deepCleanup = (obj: unknown) => {
      if (!obj || !isObjectOrFunction(obj)) return;
      const objKeys = Object.keys(obj);
      let i = 0;
      const len = objKeys.length;
      while (i < len) {
        const key = objKeys[i]!;
        if (reservedKeys.has(key)) { i++; continue; }
        const value = (obj as Record<string, unknown>)[key];
        if (value && isObject(value)) {
          if (Object.hasOwn(value, "cleanup") && isFunction((value as Record<"cleanup", unknown>).cleanup)) {
            (value as Record<"cleanup", () => void>).cleanup();
          } else {
            deepCleanup(value);
          }
        }
        i++;
      }
    };
    deepCleanup(this);
  };

  const initialIsStore = isStore(initial);

  const initialEntries = Array.from(Object.entries(initial));
  let i = 0;
  const len = initialEntries.length;
  while (i < len) {
    const [key, value] = initialEntries[i]!;
    if (reservedKeys.has(key)) {
      if (initialIsStore) { i++; continue; }
      throw new Error(`[store] createStore: reserved key collision, received "${key}"`);
    }

    if (isFunction(value)) {
      defineStoreProperty(result, key, value);
      i++;
      continue;
    }

    if (isPlainObject(value)) {
      const nestedMiddleware = middlewares?.[key as keyof T];
      const nestedOptions: StoreOptions<typeof value> | undefined = nestedMiddleware
        ? { middleware: nestedMiddleware as StoreMiddleware<typeof value> }
        : undefined;
      defineStoreProperty(result, key, createStore(value, nestedOptions));
      i++;
      continue;
    }

    const sig = signal(value);
    const middleware = middlewares?.[key as keyof T];
    const wrapped = middleware
      ? wrapWithMiddleware(sig, middleware as (val: unknown) => unknown)
      : sig;

    defineStoreProperty(
      result,
      key,
      (readonlyAll || readonlyKeys.includes(key as PropertyKey))
        ? computed(() => wrapped())
        : wrapped
    );
    i++;
  }

  return result;
}
