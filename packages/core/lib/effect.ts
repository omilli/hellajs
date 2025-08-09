import { currentValue, setCurrentSub } from "./reactive";
import { createLink, removeLink } from "./links";
import { Flags, type EffectValue, type Reactive } from "./types";


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

function disposeEffect(effect: EffectValue | Reactive): void {
  let depLink = effect.deps;
  while (depLink) {
    depLink = removeLink(depLink, effect);
  }

  if (effect.subs) removeLink(effect.subs);

  effect.flags = Flags.C;
}
