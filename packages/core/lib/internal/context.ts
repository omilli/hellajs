import type { EffectScope, Reactive } from "../types";

/** The currently executing reactive context (effect or computed). */
export let currentValue: Reactive | undefined;

/**
 * Sets the current reactive subscriber, tracking dependencies.
 * @param sub The subscriber to set as current.
 * @returns The previous subscriber.
 */
export function setCurrentSub(sub: Reactive | undefined) {
  const prev = currentValue;
  currentValue = sub;
  return prev;
}

/** The currently active effect scope. */
let activeScope: EffectScope | undefined;

/**
 * Sets the active effect scope.
 * @param scope The scope to set as active.
 * @returns The previous active scope.
 */
export function setActiveScope(scope: EffectScope | undefined) {
  const prev = activeScope;
  activeScope = scope;
  return prev;
}

/**
 * Adds an effect cleanup function to the currently active scope.
 * Lazily creates the effects Set on first registration.
 * @param cleanup The cleanup function to register.
 */
export function addScopeEffect(cleanup: () => void) {
  if (!activeScope) return;
  if (!activeScope.effects) activeScope.effects = new Set();
  activeScope.effects.add(cleanup);
}
