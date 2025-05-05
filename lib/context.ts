import { ComponentContext } from "./components";
import type { Signal } from "./reactive";
import { VNodeValue } from "./types";

// Scope defines a generic reactive scope for managing effects and signals.
export interface Scope {
  effects: Set<() => void>;
  signals: Set<Signal<unknown>>;
  cleanup: () => void;
  parent?: Scope;
}

let currentScope: Scope | null = null;

// Returns the current reactive scope, used by reactive primitives and components.
export const getCurrentScope = () => currentScope;

// Sets the current reactive scope, used during component rendering or non-UI scope creation.
export function setCurrentScope(scope: Scope | null): void {
  currentScope = scope;
}

// Creates a reactive scope for tracking effects and signals, used by components and non-UI logic.
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

// Context defines a context object for the Context API, used by Provider and useContext.
export interface Context<T> {
  id: symbol;
  defaultValue: T;
}

// Creates a context object with a default value, used in UI components.
export function createContext<T>(defaultValue: T): Context<T> {
  return {
    id: Symbol('context'),
    defaultValue,
  };
}

// Retrieves a context value from the current component's scope or its parents.
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

// Provides a context value to child components, scoping it to the current component.
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