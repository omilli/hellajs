export interface ReadonlySignal<T> {
  (): T;
  cleanup: () => void;
  subscribe: (fn: () => void) => () => void
  unsubscribe: (fn: () => void) => void
}

export interface Signal<T> extends ReadonlySignal<T> {
  (value: T): void;
  set: (value: T) => void;
}

export interface EffectScope {
  registerEffect: (fn: () => void) => void;
  cleanup?: () => void;
}

export type CurrentEffect = (() => void) & { subscriptions?: Set<Signal<unknown>> };
