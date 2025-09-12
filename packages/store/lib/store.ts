import { signal, computed } from "@hellajs/core";
import type { Store, PartialDeep, StoreOptions, ReadonlyKeys } from "./types";

const reservedKeys = new Set(["computed", "snapshot", "set", "update", "cleanup"]);


// Overload for full readonly
export function store<T extends Record<string, any>, R extends readonly (keyof T)[]>(
  initial: T,
  options: { readonly: R }
): Store<T, R[number]>;

// Overload for partial readonly
export function store<T extends Record<string, any>>(
  initial: T,
  options: { readonly: true }
): Store<T, keyof T>;

// Overload for no readonly
export function store<T extends Record<string, any>>(
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
  T extends Record<string, any>,
  O extends StoreOptions<T> | undefined = undefined
>(
  initial: T,
  options?: O
): Store<T, ReadonlyKeys<T, O>> {
  const readonlyAll = options?.readonly === true;
  const readonlyKeys = Array.isArray(options?.readonly) ? options.readonly : [];

  const result = {} as Store<T, ReadonlyKeys<T, O>>;

  result.set = function (newValue: T) {
    for (const key of Object.keys(initial)) {
      if (!(key in newValue)) continue;
      const current = this[key as keyof T];
      const value = (newValue as any)[key];
      (isPlainObject(value) && current && isObject(current) && "update" in current)
        ? (current as unknown as Store<any>).update(value as object)
        : applyUpdate(current, value);
    }
  };

  const snapshotComputed = computed(() => {
    const snapshotObj = {} as T;
    for (const key in result) {
      if (reservedKeys.has(key)) continue;
      const value = result[key as keyof T];
      if (isFunction(value)) {
        const originalValue = initial[key as keyof T];
        if (isFunction(originalValue)) {
          snapshotObj[key as keyof T] = originalValue;
        } else if ((value as any).snapshot && isFunction((value as any).snapshot)) {
          snapshotObj[key as keyof T] = (value as any).snapshot() as T[keyof T];
        } else {
          snapshotObj[key as keyof T] = (value as any)() as T[keyof T];
        }
      }
    }
    return snapshotObj;
  });

  // New snapshot method
  result.snapshot = snapshotComputed;
  
  // Deprecated computed method for backward compatibility
  result.computed = snapshotComputed;

  result.update = function (partial: PartialDeep<T>) {
    for (const [key, value] of Object.entries(partial as Record<string, unknown>)) {
      const current = this[key as keyof T];
      (isPlainObject(value) && current && isObject(current) && "update" in current)
        ? (current as unknown as Store<any>).update(value as object)
        : applyUpdate(current, value);
    }
  };

  result.cleanup = function () {
    const deepCleanup = (obj: any) => {
      if (!obj || !isObjectOrFunction(obj)) return;
      for (const key in obj) {
        if (reservedKeys.has(key)) continue;
        const value = obj[key];
        value && (
          isFunction(value.cleanup)
            ? value.cleanup()
            : isObject(value) && deepCleanup(value)
        );
      }
    }
    deepCleanup(this);
  };


  for (const [key, value] of Object.entries(initial)) {
    if (isFunction(value)) {
      defineStoreProperty(result, key, value);
      continue;
    }

    if (isPlainObject(value)) {
      defineStoreProperty(result, key, (store as any)(value as Record<string, any>));
      continue;
    }

    const sig = signal(value);
    defineStoreProperty(result, key, (readonlyAll || readonlyKeys.includes(key as PropertyKey)) ? computed(() => sig()) : sig);
  }

  return result;
}


const isPlainObject = (value: unknown): value is Record<string, any> =>
  value !== null && isObject(value) && !Array.isArray(value);


const applyUpdate = (target: any, value: unknown) => {
  if (!target) return;
  isFunction(target)
    ? target(value)
    : isPlainObject(target) && isFunction(target.update) && target.update(value as object);
};

// Helper to define properties with consistent configuration
const defineStoreProperty = (result: any, key: string, value: any) =>
  Object.defineProperty(result, key, {
    value,
    writable: true,
    enumerable: true,
    configurable: true,
  });

// Type checking helpers
const isFunction = (value: unknown): value is Function => typeof value === "function";
const isObject = (value: unknown): value is object => typeof value === "object";
const isObjectOrFunction = (value: unknown): boolean => isObject(value) || isFunction(value);

