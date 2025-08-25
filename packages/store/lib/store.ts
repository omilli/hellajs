import { signal, computed, type Signal } from "@hellajs/core";
import type { Store, PartialDeep, StoreOptions, ReadonlyKeys } from "./types";

const reservedKeys = new Set(["computed", "set", "update", "cleanup"]);

// Top-level helpers so they aren't recreated per-store instance
function isPlainObject(value: unknown): value is Record<string, any> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function applyUpdate(target: any, value: unknown) {
  if (!target) return;
  if (typeof target === "function") {
    target(value);
  } else if (isPlainObject(target) && typeof target.update === "function") {
    target.update(value as object);
  }
}

function writeFull<T extends Record<string, any>>(self: Store<T, any>, newValue: Partial<T>, initial: T): void {
  for (const key of Object.keys(initial)) {
    if (!(key in newValue)) continue;
    const current = self[key as keyof T];
    const value = (newValue as any)[key];
    if (isPlainObject(value) && current && typeof current === "object" && "update" in current) {
      (current as unknown as Store<any>).update(value as object);
    } else {
      applyUpdate(current, value);
    }
  }
}

function writePartial<T extends Record<string, any>>(self: Store<T, any>, partial: PartialDeep<T>): void {
  for (const [key, value] of Object.entries(partial as Record<string, unknown>)) {
    const current = self[key as keyof T];
    if (isPlainObject(value) && current && typeof current === "object" && "update" in current) {
      (current as unknown as Store<any>).update(value as object);
    } else {
      applyUpdate(current, value);
    }
  }
}

function defineProp<T extends Record<string, any>>(
  result: any,
  key: string,
  value: any,
  opts: { readonlyAll: boolean; readonlyKeys: readonly PropertyKey[] },
  createStore: (initial: Record<string, any>) => any
) {
  if (typeof value === "function") {
    Object.defineProperty(result, key, {
      value,
      writable: true,
      enumerable: true,
      configurable: true,
    });
    return;
  }

  if (isPlainObject(value)) {
    Object.defineProperty(result, key, {
      value: createStore(value as Record<string, any>),
      writable: true,
      enumerable: true,
      configurable: true,
    });
    return;
  }

  const sig = signal(value);
  const isReadonly = opts.readonlyAll || opts.readonlyKeys.includes(key as PropertyKey);
  Object.defineProperty(result, key, {
    value: isReadonly ? computed(() => sig()) : sig,
    writable: true,
    enumerable: true,
    configurable: true,
  });
}

/**
 * Creates a reactive store from an initial object.
 * @template T The type of the initial object.
 * @template R The readonly keys.
 * @param initial The initial object.
 * @param options Options for the store, such as readonly keys.
 * @returns A reactive store.
 */
export function store<T extends Record<string, any>, R extends readonly (keyof T)[]>(
  initial: T,
  options: { readonly: R }
): Store<T, R[number]>;

/**
 * Creates a reactive store from an initial object.
 * @template T The type of the initial object.
 * @param initial The initial object.
 * @param options Options for the store, such as making it entirely readonly.
 * @returns A reactive store.
 */
export function store<T extends Record<string, any>>(
  initial: T,
  options: { readonly: true }
): Store<T, keyof T>;

/**
 * Creates a reactive store from an initial object.
 * @template T The type of the initial object.
 * @param initial The initial object.
 * @param [options] Options for the store.
 * @returns A reactive store.
 */
export function store<T extends Record<string, any>>(
  initial: T,
  options?: { readonly?: false | undefined }
): Store<T, never>;

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
    writeFull(this as unknown as Store<T, any>, newValue!, initial);
  };

  result.computed = computed(() => {
    const computedObj = {} as T;
    for (const key in result) {
      if (reservedKeys.has(key)) continue;
      const value = result[key as keyof T];

      if (typeof value === "function") {
        if ((value as any).computed && typeof (value as any).computed === "function") {
          computedObj[key as keyof T] = (value as any).computed() as T[keyof T];
        } else {
          computedObj[key as keyof T] = (value as any)() as T[keyof T];
        }
      }
    }
    return computedObj;
  });

  result.update = function (partial: PartialDeep<T>) {
    writePartial(this as unknown as Store<T, any>, partial);
  };

  result.cleanup = function () {
    function deepCleanup(obj: any) {
      if (!obj || (typeof obj !== "object" && typeof obj !== "function")) return;
      for (const key in obj) {
        if (reservedKeys.has(key)) continue;
        const value = obj[key];
        if (value) {
          if (typeof value.cleanup === "function") {
            value.cleanup();
          } else if (typeof value === "object") {
            deepCleanup(value);
          }
        }
      }
    }
    deepCleanup(this);
  };

  for (const [key, value] of Object.entries(initial)) {
    // call shared defineProp and pass the store factory (this store function)
    defineProp<T>(result, key, value, { readonlyAll, readonlyKeys }, store as any);
  }

  return result;
}