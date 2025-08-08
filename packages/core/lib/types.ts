// Core types used throughout the reactive system

export interface Stack<T> {
  value: T;
  prev: Stack<T> | undefined;
}

export interface Reactive {
  deps?: Link;
  prevDep?: Link;
  subs?: Link;
  prevSub?: Link;
  flags: Flags;
}

export interface Link {
  source: Reactive;
  target: Reactive;
  prevSub: Link | undefined;
  nextSub: Link | undefined;
  prevDep: Link | undefined;
  nextDep: Link | undefined;
}

export enum Flags {
  Clean = 0,
  Writable = 1 << 0,
  Watching = 1 << 1,
  Tracking = 1 << 2,
  Computing = 1 << 3,
  Dirty = 1 << 4,
  Pending = 1 << 5,
}

export const enum EffectFlags {
  ScheduledInQueue = 1 << 7,
}

// Signal types
export interface SignalBase<T = unknown> extends Reactive {
  lastVal: T;
  currentVal: T;
}

export type Signal<T> = {
  (): T;
  (value: T): void;
};

// Computed types
export interface ComputedBase<T = unknown> extends Reactive {
  cachedVal: T | undefined;
  compFn: (previousValue?: T) => T;
}

export type ReadonlySignal<T> = () => T;

// Effect types
export interface EffectValue extends Reactive {
  execFn(): void;
}
