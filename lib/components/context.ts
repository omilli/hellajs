import { getCurrentScope } from "../reactive";
import type { ComponentContext } from "./component";

/**
 * Represents a Component context.
 */
export interface Context<T> {
  // A unique symbol identifying the context.
  id: symbol;
  // The default value associated with the context.
  defaultValue: T;
}

/**
 * Creates a new context object with a unique identifier and a default value.
 *
 * @typeParam T - The type of the context value.
 * @param defaultValue - The default value to be used for the context.
 * @returns A Context object representing the context.
 */
export function context<T>(defaultValue: T): Context<T> {
  return {
    id: Symbol('context'),
    defaultValue,
  };
}

/**
 * Consumes a value from the nearest ancestor that provides the specified context.
 *
 * Traverses up the component scope chain to find the closest `ComponentContext`
 * that contains the given context. If found, returns the associated value.
 * If not found, returns the context's default value.
 *
 * @typeParam T - The type of the value held by the context.
 * @param context - The context object to consume.
 * @returns The value associated with the context, or the default value if not found.
 * @throws Error if called outside of a valid component scope.
 */
export function consume<T>(context: Context<T>): T {
  const scope = getCurrentScope();
  if (!scope || !('contexts' in scope)) {
    throw new Error('useContext must be called within a Component');
  }

  let current: ComponentContext | undefined = scope as ComponentContext;
  while (current) {
    if (current.contexts.has(context)) {
      return current.contexts.get(context) as T;
    }
    current = current.parent as ComponentContext | undefined;
  }

  return context.defaultValue;
}