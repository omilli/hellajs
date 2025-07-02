import { signal, computed, type Signal } from "@hellajs/core";
import type { Store, PartialDeep, StoreOptions, ReadonlyKeys } from "./types";

const reservedKeys = ["computed", "set", "update", "cleanup"];

export function store<
  T extends Record<string, unknown>,
  O extends StoreOptions<T> | undefined = undefined
>(
  initial: T,
  options?: O
): Store<T, ReadonlyKeys<T, O>> {
  const readonlyAll = options?.readonly === true;
  const readonlyKeys = Array.isArray(options?.readonly) ? options.readonly : [];

  const result: any = function (newValue?: T) {
    if (arguments.length) {
      write<T>(result, newValue!);
    }
    return result;
  };

  result.computed = function () {
    const computedObj = {} as T;
    for (const key in this) {
      if (reservedKeys.includes(key)) continue;
      const value = this[key as keyof T];

      if (typeof value === "function") {
        if (value.computed && typeof value.computed === "function") {
          computedObj[key as keyof T] = value.computed() as T[keyof T];
        } else {
          computedObj[key as keyof T] = value() as T[keyof T];
        }
      }
    }
    return computedObj;
  };

  result.set = function (newValue: T) {
    write<T>(this, newValue);
  };

  result.update = function (partial: PartialDeep<T>) {
    write<T>(this, partial);
  };

  result.cleanup = function () {
    function deepCleanup(obj: any) {
      if (!obj || (typeof obj !== "object" && typeof obj !== "function")) return;
      for (const key in obj) {
        if (reservedKeys.includes(key)) continue;
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
    if (typeof value === "function") {
      Object.defineProperty(result, key, {
        value,
        writable: true,
        enumerable: true,
        configurable: true
      });
    } else if (isPlainObject(value)) {
      Object.defineProperty(result, key, {
        value: store(value as any, options),
        writable: true,
        enumerable: true,
        configurable: true
      });
    } else {
      const sig = signal(value);
      Object.defineProperty(result, key, {
        value: readonlyAll || readonlyKeys?.includes(key as keyof T) ? computed(() => sig()) : sig,
        writable: true,
        enumerable: true,
        configurable: true
      });
    }
  }

  return result as Store<T, ReadonlyKeys<T, O>>;
}

function write<T>(self: Store<any>, partial: PartialDeep<unknown>): void {
  for (const [key, value] of Object.entries(partial)) {
    const current = self[key as keyof T];
    const isPlain = isPlainObject(value);

    if (isPlain && current && typeof current === "object" && "update" in current) {
      // It's a nested store, call its update method
      (current as unknown as Store<any>).update(value as object);
    } else if (typeof current === "function") {
      // It's a signal function, call it with the new value
      (current as Signal<unknown>)(value);
    }
  }
}

function isPlainObject(value: unknown): value is object {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}