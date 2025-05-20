import { signal } from "./signal";
import { computed } from "./computed"; // <-- import computed
import { pushScope, popScope } from "./scope";
import type { Signal, Store, PartialDeep, StoreOptions, ReadonlyKeys } from "../types";

const reservedKeys = ["computed", "set", "update", "cleanup"];

// Main store function with dynamic return type
export function store<
  T extends object,
  O extends StoreOptions<T> | undefined = undefined
>(
  initial: T,
  options?: O
): Store<T, ReadonlyKeys<T, O>> {
  const ctx = pushScope("store");
  const readonlyAll = options?.readonly === true;
  const readonlyKeys = Array.isArray(options?.readonly) ? options.readonly : [];

  const result: any = {
    computed() {
      const computedObj = {} as T;
      for (const key in this) {
        if (reservedKeys.includes(key)) continue;
        const typedKey = key as keyof T;
        const value = this[typedKey];
        computedObj[typedKey] = (
          typeof value === "function" ? value() : value.computed()
        ) as T[keyof T];
      }
      return computedObj;
    },
    set(newValue: T) {
      for (const [key, value] of Object.entries(newValue)) {
        const typedKey = key as keyof T;
        const current = this[typedKey];
        if (isPlainObject(value) && "set" in current) {
          (current as unknown as Store<any>).set(value);
        } else {
          (current as Signal<unknown>).set(value);
        }
      }
    },
    update(partial: PartialDeep<T>) {
      for (const [key, value] of Object.entries(partial)) {
        const current = this[key as keyof T];
        if (value !== undefined) {
          if (isPlainObject(value) && "update" in current) {
            (current as unknown as Store<any>)["update"](value as object);
          } else {
            (current as Signal<unknown>).set(value);
          }
        }
      }
    },
    cleanup() {
      function deepCleanup(obj: any) {
        if (!obj || typeof obj !== "object") return;
        for (const key in obj) {
          if (reservedKeys.includes(key)) continue;
          const value = obj[key];
          if (value && typeof value === "object") {
            if (typeof value.cleanup === "function" && typeof value.set === "function") {
              value.cleanup();
            } else {
              deepCleanup(value);
            }
          }
        }
      }
      deepCleanup(this);
    },
  };

  for (const [key, value] of Object.entries(initial)) {
    const typedKey = key as keyof T;
    const shouldBeReadonly =
      readonlyAll || (readonlyKeys && readonlyKeys.includes(typedKey));
    if (isPlainObject(value)) {
      // Pass down readonly keys for nested objects
      result[typedKey] = store(
        value as any,
        options
      );
    } else if (shouldBeReadonly) {
      const sig = signal(value);
      result[typedKey] = computed(() => sig());
    } else {
      const sig = signal(value);
      result[typedKey] = sig;
    }
  }

  popScope();

  return result as Store<T, ReadonlyKeys<T, O>>;
}

function isPlainObject(value: unknown): value is object {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}