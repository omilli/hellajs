import type { Reactive } from "./types";
import { Flags } from "./types";
import { createLink, removeLink } from "./utils/link";
import { endTracking, startTracking } from "./utils/tracking";
import { validateStale } from "./utils/validate";

export interface EffectValue extends Reactive {
  execFn(): void;
}

export const enum EffectFlags {
  ScheduledInQueue = 1 << 6,
}

export const effectQueue: (EffectValue | Reactive | undefined)[] = [];

export let currentScope: Reactive | undefined;

export let currentValue: Reactive | undefined;

let queueIndex = 0;

let effectCount = 0;

export function bumpEffectCount(): number {
  return effectCount++;
}

export function effect(fn: () => void): () => void {
  const effectValue: EffectValue = {
    execFn: fn,
    subs: undefined,
    lastSub: undefined,
    deps: undefined,
    lastDep: undefined,
    flags: Flags.Watching,
  };
  if (currentValue) {
    createLink(effectValue, currentValue);
  } else if (currentScope) {
    createLink(effectValue, currentScope);
  }
  const prevSub = setCurrentSub(effectValue);
  try {
    effectValue.execFn();
  } finally {
    setCurrentSub(prevSub);
  }
  return () => disposeEffect.call(effectValue);
}

export function effectScope(fn: () => void): () => void {
  const scopeValue: Reactive = {
    deps: undefined,
    lastDep: undefined,
    subs: undefined,
    lastSub: undefined,
    flags: Flags.Clean,
  };
  if (currentScope) createLink(scopeValue, currentScope);

  const prevSub = setCurrentSub(undefined);
  const prevScope = setCurrentScope(scopeValue);
  try {
    fn();
  } finally {
    setCurrentScope(prevScope);
    setCurrentSub(prevSub);
  }
  return () => disposeEffect.call(scopeValue);
}

export function executeEffect(effectValue: EffectValue | Reactive, flags: Flags): void {
  const flagged = flags & Flags.Dirty
    || (flags & Flags.Pending && validateStale(effectValue.deps!, effectValue));

  if (flagged) {
    const prevSub = setCurrentSub(effectValue);

    startTracking(effectValue);

    try {
      (effectValue as EffectValue).execFn();
    } finally {
      setCurrentSub(prevSub);
      endTracking(effectValue);
    }
    return;
  } else if (flags & Flags.Pending) {
    effectValue.flags = flags & ~Flags.Pending;
  }

  let { deps } = effectValue;

  while (deps) {
    const { source, nextDep } = deps;
    const { flags } = source;

    if (flags & EffectFlags.ScheduledInQueue) {
      executeEffect(source, source.flags = flags & ~EffectFlags.ScheduledInQueue);
    }

    deps = nextDep;
  }
}

export function processQueue(): void {
  while (queueIndex < effectCount) {
    const effectValue = effectQueue[queueIndex];
    effectQueue[queueIndex++] = undefined;

    if (effectValue) executeEffect(effectValue, effectValue.flags &= ~EffectFlags.ScheduledInQueue);
  }

  queueIndex = 0;
  effectCount = 0;
}

export function disposeEffect(this: EffectValue | Reactive): void {
  let depLink = this.deps;

  while (depLink) depLink = removeLink(depLink, this);

  if (this.subs) removeLink(this.subs);

  this.flags = Flags.Clean;
}

export function getCurrentScope(): Reactive | undefined {
  return currentScope;
}

export function setCurrentScope(scope: Reactive | undefined) {
  const prev = currentScope;
  currentScope = scope;
  return prev;
}

export function setCurrentSub(sub: Reactive | undefined) {
  const prev = currentValue;
  currentValue = sub;
  return prev;
}

export function scheduleEffect(effectValue: EffectValue | Reactive) {
  const { flags, subs } = effectValue;

  if (!(flags & EffectFlags.ScheduledInQueue)) {
    effectValue.flags = flags | EffectFlags.ScheduledInQueue;
    subs ? scheduleEffect(subs.target as EffectValue) : effectQueue[bumpEffectCount()] = effectValue;
  }
}
