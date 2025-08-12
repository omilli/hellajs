import { currentValue, setCurrentSub } from "./reactive";
import { createLink, removeLink } from "./links";
import { Flags, type EffectValue, type Reactive } from "./types";

/**
 * Creates a reactive effect that runs a function whenever its dependencies change.
 * @param fn The function to execute as a side effect.
 * @returns A cleanup function to stop the effect.
 */
export function effect(fn: () => void): () => void {
  const effectValue: EffectValue = {
    execFn: fn,
    subs: undefined,
    prevSub: undefined,
    deps: undefined,
    prevDep: undefined,
    flags: Flags.G,
  };

  if (currentValue) {
    createLink(effectValue, currentValue);
  }

  const prevSub = setCurrentSub(effectValue);

  try {
    effectValue.execFn();
  } finally {
    setCurrentSub(prevSub);
  }
  return () => disposeEffect(effectValue);
}

/**
 * Disposes of an effect, removing all its dependencies and subscriptions.
 * @param effect The effect to dispose.
 */
function disposeEffect(effect: EffectValue | Reactive): void {
  let depLink = effect.deps;
  while (depLink) {
    depLink = removeLink(depLink, effect);
  }

  if (effect.subs) removeLink(effect.subs);

  effect.flags = Flags.C;
}
