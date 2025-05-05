import type { Signal } from "./signal";

export interface Scope {
  effects: Set<() => void>;
  signals: Set<Signal<unknown>>;
  cleanup: () => void;
  parent?: Scope;
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