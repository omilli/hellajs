import { currentValue, executeSignal, processQueue, propagate, propagateChange } from "./reactive";
import { createLink } from "./links";
import { Flags, type SignalBase } from "./types";
import { batchDepth } from "./batch";

export function signal<T>(): {
  (): T | undefined;
  (value: T | undefined): void;
};
export function signal<T>(initialValue: T): {
  (): T;
  (value: T): void;
};
export function signal<T>(initialValue?: T) {
  const signalValue: SignalBase<T> = {
    lastVal: initialValue as T,
    currentVal: initialValue as T,
    subs: undefined,
    prevSub: undefined,
    deps: undefined,
    prevDep: undefined,
    flags: Flags.Writable,
  };

  return function (value?: T) {
    const { currentVal, subs, flags } = signalValue;

    if (arguments.length > 0) {
      if (currentVal !== (signalValue.currentVal = value!)) {
        signalValue.flags = Flags.Writable | Flags.Dirty;
        if (subs) {
          propagateChange(subs);
          if (!batchDepth) processQueue();
        }
      }
      return;
    }

    if (flags & Flags.Dirty && executeSignal(signalValue, currentVal) && subs) {
      propagate(subs);
    }

    if (currentValue) {
      createLink(signalValue, currentValue);
    }

    return currentVal;
  };
}
