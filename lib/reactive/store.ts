import { signal } from "./signal";
import { pushScope, popScope } from "./scope";
import type { Signal, Store, PartialDeep } from "../types";

const reservedKeys = ["computed", "set", "update", "cleanup"];

export function store<T extends object = {}>(initial: T): Store<T> {
  const ctx = pushScope("store");
  const result: Store<T> = {
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
          (current as unknown as Store).set(value);
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
            (current as unknown as Store)["update"](value as object);
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
  } as Store<T>;

  for (const [key, value] of Object.entries(initial)) {
    const typedKey = key as keyof T;
    if (isPlainObject(value)) {
      result[typedKey] = store(value as object) as unknown as Store<T>[typeof typedKey];
    } else {
      const sig = signal(value);
      result[typedKey] = sig as Store<T>[typeof typedKey];
    }
  }

  popScope();

  return result;
}

function isPlainObject(value: unknown): value is object {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}