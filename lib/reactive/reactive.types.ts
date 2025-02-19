export interface ReactiveState {
  activeEffects: Array<() => void>;
  pendingEffects: Set<() => void>;
  disposedEffects: WeakSet<() => void>;
}

export interface ReactiveSecurity {
  effectDependencies: WeakMap<() => void, Set<Signal<any>>>;
  subscriberCount: WeakMap<Signal<any>, number>;
  maxSubscribers: number;
}

// Signal
export type SignalFunction<T> = {
  (): T;
  set: (value: T) => void;
  subscribe: (fn: () => void) => () => void;
  dispose: () => void;
};

export type Signal<T> = SignalFunction<T>;

export interface SignalConfig<T> {
  onRead?: (value: T) => void;
  onWrite?: (oldValue: T, newValue: T) => void;
  onSubscribe?: (subscriberCount: number) => void;
  onUnsubscribe?: (subscriberCount: number) => void;
  onDispose?: () => void;
  validate?: (value: T) => boolean;
  sanitize?: (value: T) => T;
}

export interface SignalState<T> {
  initialized: boolean;
  initial: T;
  config?: SignalConfig<T>;
  signal?: Signal<T>;
  pendingValue?: T;
  disposed?: boolean; // Add disposed flag
}

export interface SignalSubscribers {
  add: (fn: () => void) => () => void;
  remove: (fn: () => void) => void;
  notify: () => void;
  clear: () => void;
  set: Set<() => void>;
}

export interface SignalReadArgs<T> {
  value: T;
  subscribers: SignalSubscribers;
  state: SignalState<T>;
}

export interface SignalSetArgs<T> {
  newVal: T;
  state: SignalState<T>;
  value: { current: T };
  subscribers: SignalSubscribers;
  notify: () => void;
}

export interface SignalOptions<T> {
  subscribers: Set<() => void>;
  notify: () => void;
  state: SignalState<T>;
}

// Computed
export interface ComputedConfig<T> {
  name?: string;
  onCreate?: () => void;
  onCompute?: (value: T) => void;
}

export interface ComputedState<T> {
  initialized: boolean;
  computed?: Signal<T>;
  fn: () => T;
  config?: ComputedConfig<T>;
}

// Effect
export interface EffectOptions {
  immediate?: boolean;
}

export interface EffectState {
  active: boolean;
  fn: () => void;
  deps: Set<Signal<any>>;
  cleanup?: () => void; // Add cleanup tracking
}
