import { signal, type Signal } from "./signal";
import { scope, getCurrentScope, setCurrentScope } from "./scope";

// Utility to check if a value is a plain object
const isPlainObject = (value: unknown): value is object =>
  value !== null && typeof value === "object" && !Array.isArray(value);

// Type for nested stores (without $cleanup)
type NestedStore<T extends object = {}> = {
  [K in keyof T]: T[K] extends object ? NestedStore<T[K]> : Signal<T[K]>;
} & {
  $computed: () => T;
  $set: (value: T) => void;
  $update: (partial: Partial<T>) => void;
};

// Type for root store (with $cleanup)
export type Store<T extends object = {}> = NestedStore<T> & {
  $cleanup: () => void;
};

export function store<T extends object = {}>(initial: T): Store<T> {
  // Create a single scope for the root store
  const storeScope = scope(getCurrentScope());
  const prevScope = getCurrentScope();
  setCurrentScope(storeScope);

  // Initialize result with methods
  const result: Store<T> = {
    $computed: () => {
      const computedObj = {} as T;
      for (const key in result) {
        if (key.startsWith("$")) continue;
        const typedKey = key as keyof T;
        const value = result[typedKey];
        computedObj[typedKey] = (
          typeof value === "function" ? value() : value.$computed()
        ) as T[keyof T];
      }
      return computedObj;
    },
    $set: (newValue: T) => {
      for (const [key, value] of Object.entries(newValue)) {
        const typedKey = key as keyof T;
        const current = result[typedKey];
        if (isPlainObject(value) && "$set" in current) {
          (current as unknown as Store).$set(value);
        } else {
          (current as Signal<unknown>).set(value);
        }
      }
    },
    $update: (partial: Partial<T>) => {
      for (const [key, value] of Object.entries(partial)) {
        const typedKey = key as keyof T;
        const current = result[typedKey];
        if (value !== undefined) {
          if (isPlainObject(value) && "$set" in current) {
            (current as unknown as Store).$set(value);
          } else {
            (current as Signal<unknown>).set(value);
          }
        }
      }
    },
    $cleanup: () => {
      storeScope.cleanup();
      setCurrentScope(prevScope);
    },
  } as Store<T>;

  // Populate properties within the store's scope
  for (const [key, value] of Object.entries(initial)) {
    const typedKey = key as keyof T;
    result[typedKey] = (isPlainObject(value)
      ? store(value as object)
      : signal(value)) as Store<T>[typeof typedKey];
  }

  // Restore previous scope
  setCurrentScope(prevScope);

  return result;
}