import { setActiveScope } from "./internal";
import type { EffectScope } from "./types";

/**
 * Creates an effect scope that collects all effects created within the callback.
 * Returns a cleanup function to dispose all collected effects.
 * 
 * @param fn The callback function to execute within the scope.
 * @returns A cleanup function to stop all effects in the scope.
 */
export function scope(fn: () => void): () => void {
  const scopeState: EffectScope = {
    effects: new Set(),
    parent: undefined,
  };

  const prevScope = setActiveScope(scopeState);

  try {
    fn();
  } finally {
    setActiveScope(prevScope);
  }

  return () => {
    scopeState.effects.forEach(cleanup => cleanup());
    scopeState.effects.clear();
  };
}
