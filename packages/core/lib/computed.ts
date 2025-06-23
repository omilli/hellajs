import type { Reactive } from "./types";
import { Flags } from "./types";
import { createLink } from "./utils/link";
import { currentValue, setCurrentSub } from "./effect";
import { validateStale } from "./utils/validate";
import { propagate } from "./utils/propagate";
import { endTracking, startTracking } from "./utils/tracking";

export interface ComputedValue<T = unknown> extends Reactive {
  cachedVal: T | undefined;
  compFn: (previousValue?: T) => T;
}

export type ReadonlySignal<T> = () => T;

export function computed<T>(getter: (previousValue?: T) => T): () => T {
  const computedValue: ComputedValue<T> = {
    cachedVal: undefined,
    subs: undefined,
    lastSub: undefined,
    deps: undefined,
    lastDep: undefined,
    flags: Flags.Writable | Flags.Dirty,
    compFn: getter,
  };

  return function () {
    const { flags, deps, subs } = computedValue;
    const flagged = (flags & Flags.Dirty || (flags & Flags.Pending && validateStale(deps!, computedValue)));

    if (flagged && executeComputed(computedValue) && subs) propagate(subs);
    else if (flags & Flags.Pending) computedValue.flags = flags & ~Flags.Pending;

    if (currentValue) createLink(computedValue, currentValue);

    return computedValue.cachedVal!;
  };
}

export function executeComputed<T = unknown>(computedValue: ComputedValue<T>): boolean {
  const prevSubValue = setCurrentSub(computedValue);
  const { cachedVal, compFn } = computedValue;

  startTracking(computedValue);

  try {
    const prevValue = cachedVal;
    const newValue = compFn(prevValue);
    computedValue.cachedVal = newValue;
    return prevValue !== newValue;
  } finally {
    setCurrentSub(prevSubValue);
    endTracking(computedValue);
  }
}