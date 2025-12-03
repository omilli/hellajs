import { signal, computed, isFunction, isPlainObject } from "@hellajs/core";
import type { Store, PartialDeep, StoreOptions, ReadonlyKeys } from "./types";

/** Property names reserved by the store implementation that cannot be used in initial objects */
const reservedKeys = new Set(["computed", "snapshot", "set", "update", "cleanup"]);


/**
 * Creates a reactive store with specific readonly properties.
 * @template T The type of the initial object
 * @template R Array of readonly property keys
 * @param initial The initial object to transform into a reactive store
 * @param options Store options with specific readonly properties
 * @returns A reactive store with specified properties as readonly
 */
export function store<T extends Record<string, unknown>, R extends readonly (keyof T)[]>(
  initial: T,
  options: { readonly: R }
): Store<T, R[number]>;

/**
 * Creates a reactive store with all properties readonly.
 * @template T The type of the initial object
 * @param initial The initial object to transform into a reactive store
 * @param options Store options with all properties readonly
 * @returns A reactive store with all properties as readonly
 */
export function store<T extends Record<string, unknown>>(
  initial: T,
  options: { readonly: true }
): Store<T, keyof T>;

/**
 * Creates a reactive store with all properties writable.
 * @template T The type of the initial object
 * @param initial The initial object to transform into a reactive store
 * @param options Optional store options (readonly disabled)
 * @returns A reactive store with all properties writable
 */
export function store<T extends Record<string, unknown>>(
  initial: T,
  options?: { readonly?: false | undefined }
): Store<T, never>;

/**
 * Creates a reactive store from an initial object.
 * @template T The type of the initial object.
 * @param initial The initial object.
 * @param [options] Options for the store.
 * @returns A reactive store.
 */
export function store<
  T extends Record<string, unknown>,
  O extends StoreOptions<T> | undefined = undefined
>(
  initial: T,
  options?: O
): Store<T, ReadonlyKeys<T, O>> {
  const readonlyAll = options?.readonly === true;
  const readonlyKeys = Array.isArray(options?.readonly) ? options.readonly : [];

  const result = {} as Store<T, ReadonlyKeys<T, O>>;

  /**
   * Replaces the entire store state with a new value.
   * Only updates properties that exist in both the original store and the new value.
   * @param newValue The new state object
   */
  result.set = function (newValue: T) {
    for (const key of Object.keys(initial)) {
      if (!(key in newValue)) continue;
      const current = this[key as keyof T];
      const value = newValue[key as keyof T];
      (isPlainObject(value) && current && isObject(current) && "update" in current)
        ? (current as unknown as Store<Record<string, unknown>>).update(value as object)
        : applyUpdate(current, value);
    }
  };

  /** Reactive snapshot of the entire store state as a plain JavaScript object */
  const snapshotComputed = computed(() => {
    const snapshotObj = {} as T;
    for (const key in result) {
      if (reservedKeys.has(key)) continue;
      const value = result[key as keyof T];
      if (isFunction(value)) {
        const originalValue = initial[key as keyof T];
        if (isFunction(originalValue)) {
          snapshotObj[key as keyof T] = originalValue;
        } else if (isObject(value) && "snapshot" in value && isFunction(value.snapshot)) {
          snapshotObj[key as keyof T] = (value.snapshot as () => T[keyof T])();
        } else {
          snapshotObj[key as keyof T] = (value as () => T[keyof T])();
        }
      }
    }
    return snapshotObj;
  });

  result.snapshot = snapshotComputed;

  /**
   * Performs partial updates to the store state.
   * Only updates properties that exist in the original store.
   * @param partial Partial object containing properties to update
   */
  result.update = function (partial: PartialDeep<T>) {
    for (const [key, value] of Object.entries(partial as Record<string, unknown>)) {
      const current = this[key as keyof T];
      (isPlainObject(value) && current && isObject(current) && "update" in current)
        ? (current as unknown as Store<Record<string, unknown>>).update(value as object)
        : applyUpdate(current, value);
    }
  };

  /**
   * Recursively cleans up all reactive subscriptions to prevent memory leaks.
   * Calls cleanup on all nested stores and reactive values.
   */
  result.cleanup = function () {
    /**
     * Recursively traverses and cleans up nested reactive values
     * @param obj Object to clean up
     */
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
    }
    deepCleanup(this);
  };


  /** Initialize store properties */
  for (const [key, value] of Object.entries(initial)) {
    if (isFunction(value)) {
      defineStoreProperty(result, key, value);
      continue;
    }

    if (isPlainObject(value)) {
      defineStoreProperty(result, key, store(value));
      continue;
    }

    const sig = signal(value);
    defineStoreProperty(result, key, (readonlyAll || readonlyKeys.includes(key as PropertyKey)) ? computed(() => sig()) : sig);
  }

  return result;
}


/**
 * Checks if value is an object (excluding null) for property access checks.
 * @param value Value to check
 * @returns True if value is an object
 */
const isObject = (value: unknown): value is object =>
  typeof value === "object" && value !== null;

/**
 * Applies an update to a target (signal or store)
 * @param target The target to update (signal function or store object)
 * @param value The new value to apply
 */
const applyUpdate = (target: unknown, value: unknown) => {
  if (!target) return;
  isFunction(target)
    ? target(value)
    : isPlainObject(target) && "update" in target && isFunction(target.update) && target.update(value as object);
};

/**
 * Defines a property on a store object with consistent configuration
 * @param result The store object to define the property on
 * @param key The property key
 * @param value The property value (signal, store, or function)
 */
const defineStoreProperty = (result: Record<string, unknown>, key: string, value: unknown) =>
  Object.defineProperty(result, key, {
    value,
    writable: true,
    enumerable: true,
    configurable: true,
  });

/** Type checking helper - determines if value is an object or function */
const isObjectOrFunction = (value: unknown): boolean =>
  isObject(value) || isFunction(value);

