import { signal } from "./signal";
import { computed } from "./computed";
import { pushScope, popScope } from "./scope";
import type { Signal, Store, PartialDeep, StoreOptions, ReadonlyKeys } from "../types";

const reservedKeys = ["computed", "set", "update", "cleanup"];

export function store<
  T extends object,
  O extends StoreOptions<T> | undefined = undefined
>(
  initial: T,
  options?: O
): Store<T, ReadonlyKeys<T, O>> {
  const readonlyAll = options?.readonly === true;
  const readonlyKeys = Array.isArray(options?.readonly) ? options.readonly : [];

  pushScope("store");

  const result: any = {
    computed() {
      const computedObj = {} as T;
      for (const key in this) {
        if (reservedKeys.includes(key)) continue;
        const value = this[key as keyof T];
        computedObj[key as keyof T] = (
          typeof value === "function" ? value() : value.computed()
        ) as T[keyof T];
      }
      return computedObj;
    },
    set(newValue: T) {
      write<T>(this, newValue);
    },
    update(partial: PartialDeep<T>) {
      write<T>(this, partial);
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
    if (isPlainObject(value)) {
      result[key as keyof T] = store(
        value as any,
        options
      );
    } else {
      const sig = signal(value);
      result[key as keyof T] = readonlyAll || readonlyKeys?.includes(key as keyof T) ? computed(() => sig()) : sig;
    }
  }

  popScope();

  return result as Store<T, ReadonlyKeys<T, O>>;
}

function write<T>(self: Store<any>, partial: PartialDeep<unknown>): void {
  for (const [key, value] of Object.entries(partial)) {
    const current = self[key as keyof T];
    const isPlain = isPlainObject(value);
    if (isPlain && "update" in current) {
      (current as unknown as Store<any>)["update"](value as object);
    }
    if ((isPlain && "set" in current) || !isPlain) {
      (current as Signal<unknown>).set(value);
    }
  }
}

function isPlainObject(value: unknown): value is object {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}