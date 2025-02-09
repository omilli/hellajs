export interface ReactiveState {
  batchingSignals: boolean;
  activeEffects: Array<() => void>;
  pendingEffects: Set<() => void>;
  stores: WeakMap<
    object,
    {
      store: Set<StoreEffect>;
      effects: Set<() => void>;
    }
  >;
  resourceCache: Map<string, ResourceCache>;
  activeRequests: Map<string, AbortController>;
}

// Signal

// Base types
export type SignalFunction<T> = {
  (): T;
  set: (value: T) => void;
  subscribe: (fn: () => void) => () => void;
  dispose: () => void;
};

export type Signal<T> = SignalFunction<T>;

// Configuration
export interface SignalConfig<T> {
  onRead?: (value: T) => void;
  onWrite?: (oldValue: T, newValue: T) => void;
  onSubscribe?: (subscriberCount: number) => void;
  onUnsubscribe?: (subscriberCount: number) => void;
  onDispose?: () => void;
  validate?: (value: T) => boolean;
  sanitize?: (value: T) => T;
}

// Internal state
export interface SignalState<T> {
  initialized: boolean;
  initial: T;
  config?: SignalConfig<T>;
  signal?: Signal<T>;
  pendingValue?: T;
}

export interface SignalSubscribers {
  add: (fn: () => void) => () => void;
  remove: (fn: () => void) => void;
  notify: () => void;
  clear: () => void;
  set: Set<() => void>;
}

// Operation args
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
}

// Store
export interface StoreOptions {
  readonly?: boolean | Array<string | number | symbol>;
}

export type StoreMethods<T> = {
  [K in keyof T as T[K] extends Function ? K : never]: T[K];
};

export type StoreState<T> = {
  [K in keyof T as T[K] extends Function ? never : K]: T[K];
};

export type StoreEffectFn = (fn: () => void) => () => void;

export type StoreComputed<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any
    ? ReturnType<T[K]>
    : T[K];
};

export type StoreSignals<T> = {
  [K in keyof StoreState<T>]: Signal<StoreState<T>[K]>;
} & StoreMethods<T> & {
    set(
      update:
        | Partial<StoreState<T>>
        | ((storeSignals: StoreSignals<T>) => Partial<StoreState<T>>)
    ): void;
    cleanup(): void;
    computed(): StoreComputed<T>;
  };

export type StoreInternals<T> = {
  signals: Map<keyof T, Signal<any>>;
  methods: Map<keyof T, Function>;
  effects: Set<() => void>;
  isDisposed: boolean;
  isInternal: boolean;
};

export type StoreEffect = (key: string | number | symbol, value: any) => void;

// Resource
export interface ResourceOptions<T> {
  transform?: (data: T) => T;
  onError?: (response: Response) => void;
  cache?: boolean;
  cacheTime?: number;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  validate?: (data: T) => boolean;
  poolSize?: number;
}

export interface ResourceResult<T> {
  data: Signal<T | undefined>;
  loading: Signal<boolean>;
  error: Signal<Error | undefined>;
  fetch: () => Promise<void>;
  abort: () => void;
  refresh: () => Promise<void>;
  invalidate: () => void;
}

export interface ResourceCache {
  data: any;
  timestamp: number;
  promise?: Promise<any>;
}

// Security

export interface SecurityState {
  effectDependencies: WeakMap<() => void, Set<Signal<any>>>;
  signalSubscriberCount: WeakMap<Signal<any>, number>;
  maxDependencies: number;
  maxSubscribers: number;
}
