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
