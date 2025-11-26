import { setActiveScope } from "./internal";
import type { EffectScope } from "./types";

/** Shared no-op cleanup for scopes with no effects */
const NOOP = () => { };

/**
 * Creates an effect scope that collects all effects created within the callback.
 * Returns a cleanup function to dispose all collected effects.
 * Uses lazy Set allocation - only creates Set when effects are registered.
 * 
 * @param fn The callback function to execute within the scope.
 * @returns A cleanup function to stop all effects in the scope.
 */
export function scope(fn: () => void): () => void {
  const scopeState: EffectScope = {
    effects: undefined,
    parent: undefined,
  };

  const prevScope = setActiveScope(scopeState);

  try {
    fn();
  } finally {
    setActiveScope(prevScope);
  }

  // Return shared no-op if no effects were registered
  if (!scopeState.effects) return NOOP;

  return () => {
    scopeState.effects!.forEach(cleanup => cleanup());
    scopeState.effects!.clear();
  };
}
