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
  flags: number;
}

export interface Link {
  source: Reactive;
  target: Reactive;
  prevSub: Link | undefined;
  nextSub: Link | undefined;
  prevDep: Link | undefined;
  nextDep: Link | undefined;
}

export const Flags = {
  C: 0,  // Clean
  W: 1,  // Writable
  G: 2,  // Guard
  T: 4,  // Tracking
  M: 8,  // Computing (eMit)
  D: 16, // Dirty
  P: 32, // Pending
} as const;

export const SCHEDULED = 128;

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
