import { signal, computed, isFunction, isPlainObject } from "@hellajs/core";
import type { Store, PartialDeep, StoreOptions, StoreMiddleware } from "./types";
import { deepClone, extractChanges } from "./draft";
import {
  reservedKeys,
  isObject,
  isObjectOrFunction,
  applyUpdate,
  wrapWithMiddleware,
  defineStoreProperty
} from "./utils";

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
    for (const key in result) {
      if (reservedKeys.has(key)) continue;
      const value = result[key as keyof T];
      const originalValue = initial[key as keyof T];

      if (isFunction(originalValue)) {
        snapshotObj[key as keyof T] = originalValue;
      } else if (isObject(value) && "snapshot" in value && isFunction(value.snapshot)) {
        snapshotObj[key as keyof T] = (value.snapshot as () => T[keyof T])();
      } else if (isFunction(value)) {
        snapshotObj[key as keyof T] = (value as () => T[keyof T])();
      }
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

    for (const [key, value] of Object.entries(resolvedPartial as Record<string, unknown>)) {
      const current = this[key as keyof T];
      (isPlainObject(value) && current && isObject(current) && "update" in current)
        ? (current as unknown as Store<Record<string, unknown>>).update(value as object)
        : applyUpdate(current, value, middlewares, key as string);
    }
  };

  result.cleanup = function () {
    const deepCleanup = (obj: unknown) => {
      if (!obj || !isObjectOrFunction(obj)) return;
      for (const key in obj) {
        if (reservedKeys.has(key)) continue;
        const value = (obj as Record<string, unknown>)[key];
        value && (
          isObject(value) && "cleanup" in value && isFunction(value.cleanup)
            ? value.cleanup()
            : isObject(value) && deepCleanup(value)
        );
      }
    };
    deepCleanup(this);
  };

  for (const [key, value] of Object.entries(initial)) {
    if (isFunction(value)) {
      defineStoreProperty(result, key, value);
      continue;
    }

    if (isPlainObject(value)) {
      const nestedMiddleware = middlewares?.[key as keyof T];
      const nestedOptions: StoreOptions<typeof value> | undefined = nestedMiddleware
        ? { middleware: nestedMiddleware as StoreMiddleware<typeof value> }
        : undefined;
      defineStoreProperty(result, key, createStore(value, nestedOptions));
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
  }

  return result;
}
