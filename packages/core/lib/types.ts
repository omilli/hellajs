export interface Reactive {
  subs: Subscriber[];
  read?: () => unknown;
  version: number | (() => number);
}

export interface EffectState {
  sources: Reactive[];
  flags: number[];
  fn: (() => void) | null;
  cleanup: (() => void) | null;
  id: number;
}

export type ComputedFn<T> = (previousValue: T | undefined) => T;

export interface ComputedState<T> {
  subs: Subscriber[];
  version: number | (() => number);
  read: () => T;
  sources: Reactive[];
  flags: number[];
  id: number;
}

export type Subscriber = (() => void) & { node?: EffectState | ComputedState<unknown> };

export interface SignalState<T> {
  subs: Subscriber[];
  read: () => T;
  version: () => number;
}

export interface Signal<T> {
  (value?: T): T;
  subs: Subscriber[];
  version: () => number;
  read: () => T;
}

export type Context = EffectState | ComputedState<unknown> | null;