import { createLink } from "./utils/link";
import type { Reactive } from "./types";
import { Flags } from "./types";
import { currentValue, processQueue } from "./effect";
import { batchDepth } from "./batch";
import { propagate, propagateChange } from "./utils/propagate";

export interface SignalValue<T = unknown> extends Reactive {
  lastVal: T;
  currentVal: T;
}

export type Signal<T> = {
  (): T;
  (value: T): void;
};

export function signal<T>(): {
  (): T | undefined;
  (value: T | undefined): void;
};
export function signal<T>(initialValue: T): {
  (): T;
  (value: T): void;
};
export function signal<T>(initialValue?: T) {
  const signalValue: SignalValue<T> = {
    lastVal: initialValue as T,
    currentVal: initialValue as T,
    subs: undefined,
    lastSub: undefined,
    deps: undefined,
    lastDep: undefined,
    flags: Flags.Writable,
  };

  return function (value?: T) {
    const { currentVal, subs, flags } = signalValue;

    if (arguments.length) {
      if (currentVal !== (signalValue.currentVal = value!)) {
        signalValue.flags = Flags.Writable | Flags.Dirty;
        if (subs) {
          propagateChange(subs);
          if (!batchDepth) processQueue();
        }
      }
      return;
    } else {
      const val = currentVal;
      if (flags & Flags.Dirty && executeSignal(signalValue, val) && subs) propagate(subs);
      if (currentValue) createLink(signalValue, currentValue);
      return val;
    }
  };
}

export function executeSignal(signalValue: SignalValue, value: unknown): boolean {
  signalValue.flags = Flags.Writable;
  return signalValue.lastVal !== (signalValue.lastVal = value);
}