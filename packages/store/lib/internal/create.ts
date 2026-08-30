import { signal, computed, effect, untracked, isFunction, isPlainObject, isObject } from "./core";
import type { Store, Snapshot, PartialDeep, StoreOptions, StoreMiddleware } from "../types";
import { deepClone, extractChanges } from "./draft";
import {
  reservedKeys,
  isObjectOrFunction,
  isStore,
  applyUpdate,
  wrapWithMiddleware,
  defineStoreProperty
} from "./utils";

/**
 * @internal
 * Non-enumerable registry of signal-backed (settable) keys, attached to every
 * store. update() writes only these keys — reserved methods and preserved user
 * functions are never settable. Composition threads the source store's registry.
 */
const settableRegistry = Symbol("hellajs.store.settableKeys");

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
 * @returns Reactive store with snapshot, update, cleanup, and subscribe methods
 */
export function createStore<T extends Record<string, unknown>>(
  initial: T,
  options?: StoreOptions<T>
): Store<T, never> {
  const readonlyAll = options?.readonly === true;
  const readonlyKeys = Array.isArray(options?.readonly) ? options.readonly : [];
  const middlewares = options?.middleware;
  const equalsOptions = options?.equals;

  const result = {} as Store<T, never>;
  const settableKeys = new Set<string>();
  let resultKeys: string[] = [];

  const snapshotComputed = computed((): Snapshot<T> => {
    const snapshotObj = {} as Record<string, unknown>;
    let i = 0;
    const len = resultKeys.length;
    while (i < len) {
      const key = resultKeys[i]!;
      if (reservedKeys.has(key)) { i++; continue; }
      const value = result[key as keyof T];
      const originalValue = initial[key as keyof T];

      if (isFunction(originalValue) && !settableKeys.has(key)) {
        snapshotObj[key] = originalValue;
      } else if (isStore(value)) {
        snapshotObj[key] = (value as { snapshot: () => unknown }).snapshot();
      } else if (isFunction(value)) {
        snapshotObj[key] = (value as () => unknown)();
      } else {
        snapshotObj[key] = value;
      }
      i++;
    }
    return snapshotObj as Snapshot<T>;
  });

  result.snapshot = snapshotComputed;

  result.update = function (partial: PartialDeep<T> | ((draft: Snapshot<T>) => void)) {
    let resolvedPartial: PartialDeep<T>;

    if (isFunction(partial)) {
      const snapshot = this.snapshot() as unknown as T;
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
      } else if (settableKeys.has(key)) {
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

  /**
   * Subscribes to changes of a single signal-backed property. Thin wrapper over a core
   * effect: the initial run captures the current value and is suppressed from the
   * callback; later runs fire the callback with (next, prev) inside untracked so reads
   * in the callback never widen the subscription. Returns the effect's disposer.
   */
  result.subscribe = <K extends keyof T>(key: K, callback: (next: T[K], prev: T[K]) => void): (() => void) => {
    const keyName = key as string;
    if (!settableKeys.has(keyName)) {
      throw new Error(`[store] subscribe: "${keyName}" is not a settable key`);
    }
    const target = result[key] as () => unknown;
    let prev: unknown;
    let started = false;
    return effect(() => {
      const next = target();
      if (!started) {
        prev = next;
        started = true;
        return;
      }
      untracked(() => { callback(next as T[K], prev as T[K]); });
      prev = next;
    });
  };

  const initialIsStore = isStore(initial);
  const sourceSettable = initialIsStore
    ? ((initial as Record<symbol, Set<string> | undefined>)[settableRegistry])
    : undefined;

  const initialEntries = Array.from(Object.entries(initial));
  let i = 0;
  const len = initialEntries.length;
  while (i < len) {
    const [key, value] = initialEntries[i]!;
    if (reservedKeys.has(key)) {
      if (initialIsStore) { i++; continue; }
      throw new Error(`[store] store: reserved key collision, received "${key}"`);
    }

    if (isFunction(value)) {
      defineStoreProperty(result, key, value);
      if (sourceSettable?.has(key)) { settableKeys.add(key); }
      i++;
      continue;
    }

    if (isPlainObject(value)) {
      const nestedMiddleware = middlewares?.[key as keyof T];
      const nestedEquals = equalsOptions?.[key as keyof T] as StoreEquals<typeof value> | undefined;
      const nestedOptions: StoreOptions<typeof value> | undefined = nestedMiddleware || nestedEquals
        ? {
            middleware: nestedMiddleware as StoreMiddleware<typeof value>,
            equals: nestedEquals
          }
        : undefined;
      defineStoreProperty(result, key, createStore(value, nestedOptions));
      i++;
      continue;
    }

    const equalsOpt = equalsOptions?.[key as keyof T];
    if (equalsOpt !== undefined && equalsOpt !== "structural" && !isFunction(equalsOpt)) {
      throw new Error(`[store] store: equals for "${key}" must be a function or "structural", received ${typeof equalsOpt}`);
    }
    // Equality runs inside the signal, after middleware: wrapWithMiddleware writes sig(mw(value)).
    const equalsFn = equalsOpt === "structural"
      ? structurallyEqual
      : equalsOpt as ((previous: typeof value, next: typeof value) => boolean) | undefined;
    const sig = equalsFn === undefined
      ? signal(value)
      : signal(value, { equals: equalsFn });
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
    settableKeys.add(key);
    i++;
  }

  Object.defineProperty(result, settableRegistry, { value: settableKeys });

  resultKeys = Object.keys(result);

  return result;
}
