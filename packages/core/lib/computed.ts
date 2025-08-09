import { currentValue, executeComputed, propagate, validateStale } from "./reactive";
import { createLink } from "./links";
import { Flags, type ComputedBase } from "./types";

export function computed<T>(getter: (previousValue?: T) => T): () => T {
  const computedValue: ComputedBase<T> = {
    cachedVal: undefined,
    subs: undefined,
    prevSub: undefined,
    deps: undefined,
    prevDep: undefined,
    flags: Flags.W | Flags.D,
    compFn: getter,
  };

  return function () {
    const { flags, deps, subs } = computedValue;
    const flagged = (flags & Flags.D || (flags & Flags.P && validateStale(deps!, computedValue)));

    if (flagged && executeComputed(computedValue) && subs) {
      propagate(subs);
    } else if (flags & Flags.P) {
      computedValue.flags = flags & ~Flags.P;
    }

    if (currentValue) {
      createLink(computedValue, currentValue);
    }

    return computedValue.cachedVal!;
  };
}