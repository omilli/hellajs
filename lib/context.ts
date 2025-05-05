import type { Signal } from "./reactive";
import { HTMLTagName, VNodeValue } from "./types";
import { ComponentContext } from "./components";

export interface Scope {
  effects: Set<() => void>;
  signals: Set<Signal<unknown>>;
  cleanup: () => void;
  parent?: Scope;
}

export interface Context<T> {
  id: symbol;
  defaultValue: T;
}

let currentScope: Scope | null = null;

export const getCurrentScope = () => currentScope;

export function setCurrentScope(scope: Scope | null): void {
  currentScope = scope;
}

export function createScope(parent: Scope | null = getCurrentScope()): Scope {
  const scope: Scope = {
    effects: new Set(),
    signals: new Set(),
    parent: parent || undefined,
    cleanup: () => {
      for (const cleanup of scope.effects) {
        cleanup();
      }
      scope.effects.clear();
      for (const signal of scope.signals) {
        signal.cleanup();
      }
      scope.signals.clear();
      scope.parent = undefined;
    },
  };
  return scope;
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
    tag: 'fragment' as HTMLTagName,
    props: {},
    children,
  };
}