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

export function scope<T>(fn?: () => T, parent: Scope | null = getCurrentScope()): Scope & { result?: T } {
  const s: Scope & { result?: T } = {
    effects: new Set(),
    signals: new Set(),
    parent: parent || undefined,
    cleanup: () => {
      for (const cleanup of s.effects) cleanup();
      s.effects.clear();
      for (const signal of s.signals) signal.cleanup();
      s.signals.clear();
      s.parent = undefined;
    },
  };
  if (fn) {
    const prev = getCurrentScope();
    setCurrentScope(s);
    try {
      s.result = fn();
    } finally {
      setCurrentScope(prev);
    }
  }
  return s;
}