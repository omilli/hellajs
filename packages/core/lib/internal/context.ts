import type { Reactive } from "../types";

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

/** Effect scope for collecting and batch-disposing effects. */
export interface EffectScope {
  effects: Set<() => void>;
  parent?: EffectScope;
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
 * @param cleanup The cleanup function to register.
 */
export function addScopeEffect(cleanup: () => void) {
  activeScope?.effects.add(cleanup);
}
