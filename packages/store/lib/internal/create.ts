import { signal, computed, effect, untracked, isFunction, isPlainObject, isObject } from "./core";
import type { Store, Snapshot, PartialDeep, StoreOptions, StoreMiddleware, StoreEquals } from "../types";
import { deepClone, extractChanges, structurallyEqual } from "./draft";
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
 * store. $update() writes only these keys — reserved methods and preserved user
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
 * @returns Reactive store with $snapshot, $update, $cleanup, and $subscribe methods; $update() returns the store itself
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
  // Own data keys feeding the snapshot computed. The add-branch appends by
  // writing a new array (reference-inequality always notifies), so every
  // materialized key invalidates the snapshot exactly once.
  const keysSignal = signal<string[]>([]);

  const snapshotComputed = computed((): Snapshot<T> => {
    const snapshotObj = {} as Record<string, unknown>;
    const keys = keysSignal();
    let i = 0;
    const len = keys.length;
    while (i < len) {
      const key = keys[i]!;
      if (reservedKeys.has(key)) { i++; continue; }
      const value = result[key as keyof T];
      const originalValue = initial[key as keyof T];

      if (isFunction(originalValue) && !settableKeys.has(key)) {
        snapshotObj[key] = originalValue;
      } else if (isStore(value)) {
        snapshotObj[key] = (value as { $snapshot: () => unknown }).$snapshot();
      } else if (isFunction(value)) {
        snapshotObj[key] = (value as () => unknown)();
      } else {
        snapshotObj[key] = value;
      }
      i++;
    }
    return snapshotObj as Snapshot<T>;
  });

  defineStoreProperty(result, "$snapshot", snapshotComputed, { writable: false });

  const initialIsStore = isStore(initial);
  const sourceSettable = initialIsStore
    ? ((initial as Record<symbol, Set<string> | undefined>)[settableRegistry])
    : undefined;

  /**
   * Materializes one key onto the store — the shared per-key transformation of
   * the init pass and $update()'s add-branch: functions are preserved as-is
   * (settable only when the source store backed them), plain objects recurse
   * into nested stores with threaded options, everything else becomes a signal
   * with per-key equals and optional middleware wiring. The init pass stores
   * the raw value (initial values bypass middleware); the add-branch is a set,
   * so it transforms. Callers append the key to the snapshot keys signal after
   * this returns, so a synchronous snapshot re-run always finds the property
   * defined.
   */
  const materializeKey = (key: string, value: unknown, applyMiddleware: boolean) => {
    if (isFunction(value)) {
      defineStoreProperty(result, key, value);
      if (sourceSettable?.has(key)) { settableKeys.add(key); }
      return;
    }

    if (isPlainObject(value)) {
      const nestedMiddleware = middlewares?.[key as keyof T];
      const nestedEquals = equalsOptions?.[key as keyof T] as StoreEquals<typeof value> | undefined;
      if (nestedEquals !== undefined && !isPlainObject(nestedEquals)) {
        throw new Error(`[store] store: equals for "${key}" must be a nested equals map, received ${typeof nestedEquals}`);
      }
      const nestedReadonly = readonlyAll || readonlyKeys.includes(key as PropertyKey);
      const nestedOptions: StoreOptions<typeof value> | undefined =
        nestedReadonly || nestedMiddleware || nestedEquals
          ? {
              ...(nestedReadonly && { readonly: true }),
              ...(nestedMiddleware && { middleware: nestedMiddleware as StoreMiddleware<typeof value> }),
              ...(nestedEquals && { equals: nestedEquals })
            }
          : undefined;
      defineStoreProperty(result, key, createStore(value, nestedOptions), { writable: false });
      return;
    }

    const equalsOpt = equalsOptions?.[key as keyof T];
    if (equalsOpt !== undefined && equalsOpt !== "structural" && !isFunction(equalsOpt)) {
      throw new Error(`[store] store: equals for "${key}" must be a function or "structural", received ${typeof equalsOpt}`);
    }
    // Equality runs inside the signal, after middleware: wrapWithMiddleware writes sig(mw(value)).
    const equalsFn = equalsOpt === "structural"
      ? structurallyEqual
      : equalsOpt as ((previous: typeof value, next: typeof value) => boolean) | undefined;
    const middleware = middlewares?.[key as keyof T];
    const processed = applyMiddleware && middleware
      ? (middleware as (val: unknown) => unknown)(value)
      : value;
    const sig = equalsFn === undefined
      ? signal(processed)
      : signal(processed, { equals: equalsFn });
    const wrapped = middleware
      ? wrapWithMiddleware(sig, middleware as (val: unknown) => unknown)
      : sig;

    if (readonlyAll || readonlyKeys.includes(key as PropertyKey)) {
      const ro = computed(() => wrapped());
      defineStoreProperty(
        result,
        key,
        (...args: unknown[]) => {
          if (args.length > 0) {
            throw new Error(`[store] readonly key "${key}"`);
          }
          return ro();
        },
        { writable: false }
      );
    } else {
      defineStoreProperty(result, key, wrapped, { writable: false });
    }
    settableKeys.add(key);
  };

  /**
   * Resolves a partial or draft-mutator into a per-key partial, then walks it:
   * plain-object values recurse into nested stores, registry keys write through
   * applyUpdate (middleware-aware), unknown absent keys materialize (the call
   * returns this same store), everything else throws.
   */
  defineStoreProperty(
    result,
    "$update",
    function (this: Store<T, never>, partial: PartialDeep<T> | ((draft: Snapshot<T>) => void)) {
      let resolvedPartial: PartialDeep<T>;

      if (isFunction(partial)) {
        const snapshot = this.$snapshot() as unknown as T;
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
        if (isPlainObject(value) && current && isObject(current) && Object.hasOwn(current, "$update")) {
          (current as unknown as Store<Record<string, unknown>>).$update(value as Record<string, unknown>);
        } else if (settableKeys.has(key)) {
          applyUpdate(current, value, middlewares, key as string);
        } else if (reservedKeys.has(key)) {
          throw new Error(`[store] $update: reserved key "${key}"`);
        } else if (Object.hasOwn(initial, key) && isFunction(initial[key as keyof T])) {
          throw new Error(`[store] $update: "${key}" is a function property, not state — assign it directly`);
        } else if (isObject(current) && Object.hasOwn(current, "$update")) {
          throw new Error(`[store] $update: store key "${key}" requires an object value`);
        } else if (current === undefined) {
          // Add-branch: an absent key materializes. Earlier branches (recursion,
          // settable) own every materialized case, so this fires exactly once
          // per key; readonly and function values throw before any mutation.
          if (readonlyAll || readonlyKeys.includes(key as PropertyKey)) {
            throw new Error(`[store] readonly key "${key}"`);
          }
          if (isFunction(value)) {
            throw new Error(`[store] $update: key "${key}" cannot hold a function`);
          }
          materializeKey(key, value, true);
          keysSignal([...keysSignal(), key]);
        } else {
          throw new Error(`[store] $update: unknown key "${key}"`);
        }
        i++;
      }

      return this;
    },
    { writable: false }
  );

  /**
   * Internal recursive teardown that walks the store tree disposing all nested stores.
   * Individual signals are not disposed — they remain functional. Only the store structure is torn down.
   */
  defineStoreProperty(
    result,
    "$cleanup",
    function (this: Store<T, never>) {
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
            if (Object.hasOwn(value, "$cleanup") && isFunction((value as Record<"$cleanup", unknown>).$cleanup)) {
              (value as Record<"$cleanup", () => void>).$cleanup();
            } else {
              deepCleanup(value);
            }
          }
          i++;
        }
      };
      deepCleanup(this);
    },
    { writable: false }
  );

  /**
   * Subscribes to changes of a single signal-backed property. Thin wrapper over a core
   * effect: the initial run captures the current value and is suppressed from the
   * callback; later runs fire the callback with (next, prev) inside untracked so reads
   * in the callback never widen the subscription. Returns the effect's disposer.
   */
  defineStoreProperty(
    result,
    "$subscribe",
    <K extends keyof T>(key: K, callback: (next: T[K], prev: T[K]) => void): (() => void) => {
      const keyName = key as string;
      if (!settableKeys.has(keyName)) {
        throw new Error(`[store] $subscribe: "${keyName}" is not a settable key`);
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
    },
    { writable: false }
  );

  const initialEntries = Array.from(Object.entries(initial));
  let i = 0;
  const len = initialEntries.length;
  while (i < len) {
    const [key, value] = initialEntries[i]!;
    if (reservedKeys.has(key)) {
      if (initialIsStore) { i++; continue; }
      throw new Error(`[store] store: reserved key collision, received "${key}"`);
    }

    materializeKey(key, value, false);
    i++;
  }

  Object.defineProperty(result, settableRegistry, { value: settableKeys });

  keysSignal(Object.keys(result));

  return result;
}
