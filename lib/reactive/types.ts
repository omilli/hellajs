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
  security: {
    effectDependencies: WeakMap<() => void, Set<Signal<any>>>;
    signalSubscriberCount: WeakMap<Signal<any>, number>;
    maxDependencies: number;
    maxSubscribers: number;
  };
}

// Signal

export interface Signal<T> {
  (): T;
  set(value: T): void;
  subscribe(fn: () => void): () => void;
  dispose(): void;
}

export interface SignalConfig<T> {
  name?: string;
  onRead?: (value: T) => void;
  onWrite?: (oldValue: T, newValue: T) => void;
  onSubscribe?: (subscriberCount: number) => void;
  onUnsubscribe?: (subscriberCount: number) => void;
  onDispose?: () => void;
  validate?: (value: T) => boolean;
  sanitize?: (value: T) => T;
}

// Computed

export interface ComputedConfig<T> {
  name?: string;
  onCreate?: () => void;
  onCompute?: (value: T) => void;
}

export interface SignalState<T> {
  initialized: boolean;
  signal?: Signal<T>;
  initial: T;
  config?: SignalConfig<T>;
  pendingValue?: T;
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

// Store
export type StoreMethods<T> = {
  [K in keyof T as T[K] extends Function ? K : never]: T[K];
};

export type StoreState<T> = {
  [K in keyof T as T[K] extends Function ? never : K]: T[K];
};

export type StoreEffectFn = (fn: () => void) => () => void;

export type StoreSignals<T> = {
  [K in keyof StoreState<T>]: Signal<StoreState<T>[K]>;
} & StoreMethods<T> & {
    set(
      update:
        | Partial<StoreState<T>>
        | ((storeSignals: StoreSignals<T>) => Partial<StoreState<T>>)
    ): void;
    cleanup(): void;
    effect: StoreEffectFn;
  };

export type StoreInternals<T> = {
  signals: Map<keyof T, Signal<any>>;
  methods: Map<keyof T, Function>;
  effects: Set<() => void>;
  isDisposed: boolean;
};

export type StoreEffect = (key: string | number | symbol, value: any) => void;

export type StoreEffectTarget<T> =
  | StoreSignals<T>
  | [StoreSignals<T>, ...Array<keyof StoreState<T>>];

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
