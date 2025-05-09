import { signal, type Signal } from "./signal";
import { pushScope, popScope } from "./scope";

// Utility to check if a value is a plain object
const isPlainObject = (value: unknown): value is object =>
  value !== null && typeof value === "object" && !Array.isArray(value);

// Recursive Partial type for nested updates
type PartialDeep<T> = {
  [K in keyof T]?: T[K] extends object ? PartialDeep<T[K]> : T[K];
};

// Type for nested stores (without cleanup)
type NestedStore<T extends object = {}> = {
  [K in keyof T]: T[K] extends object ? NestedStore<T[K]> : Signal<T[K]>;
} & {
  computed: () => T;
  set: (value: T) => void;
  update: (partial: PartialDeep<T>) => void;
};

// Type for root store (with cleanup)
export type Store<T extends object = {}> = NestedStore<T> & {
  cleanup: () => void;
};

const reservedKeys = ["computed", "set", "update", "cleanup"];

export function store<T extends object = {}>(initial: T): Store<T> {
  // Create a new scope for this store
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
        const typedKey = key as keyof T;
        const current = this[typedKey];
        if (value !== undefined) {
          if (isPlainObject(value) && "update" in current) {
            (current as unknown as Store)["update"](value as object);
          } else {
            (current as Signal<unknown>).set(value);
          }
        }
      }
    },
    cleanup: () => {
      popScope(); // Cleans up all signals/effects in this store's scope
    },
  } as Store<T>;

  // Populate properties within the store's scope
  for (const [key, value] of Object.entries(initial)) {
    const typedKey = key as keyof T;
    if (isPlainObject(value)) {
      result[typedKey] = store(value as object) as unknown as Store<T>[typeof typedKey];
    } else {
      const sig = signal(value);
      result[typedKey] = sig as Store<T>[typeof typedKey];
    }
  }

  popScope(); // Finalize scope setup

  return result;
}