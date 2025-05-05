import { getCurrentScope } from "../reactive";
import type { ComponentContext } from "./component";

export interface Context<T> {
  id: symbol;
  defaultValue: T;
}

export function context<T>(defaultValue: T): Context<T> {
  return {
    id: Symbol('context'),
    defaultValue,
  };
}

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