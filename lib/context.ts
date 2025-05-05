import type { ComponentContext } from "./component";
import { getCurrentScope } from "./scope";
import type { VNodeValue } from "./types";

export interface Context<T> {
  id: symbol;
  defaultValue: T;
}

export function createContext<T>(defaultValue: T): Context<T> {
  return {
    id: Symbol('context'),
    defaultValue,
  };
}

export function useContext<T>(context: Context<T>): T {
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

export function Provider<T>({ context, value, children }: {
  context: Context<T>;
  value: T;
  children: VNodeValue[];
}) {
  const scope = getCurrentScope();
  if (!scope || !('contexts' in scope)) {
    throw new Error('Provider must be used within a Component');
  }

  (scope as ComponentContext).contexts.set(context, value);

  return {
    tag: 'fragment',
    props: {},
    children,
  };
}