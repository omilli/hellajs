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

export type StoreOptions = {
  readonly?: boolean | string[];
  internalMutable?: boolean;
};

export type StoreInternals<T> = {
  signals: Map<keyof T, Signal<any>>;
  methods: Map<keyof T, Function>;
  readonly: Set<string>;
  effects: Set<() => void>; // Add this line
};

export type StoreEffect = (key: string | number | symbol, value: any) => void;

export type StoreEffectTarget<T> =
  | StoreSignals<T>
  | [StoreSignals<T>, ...Array<keyof StoreState<T>>];

// Resource
export interface ResourceOptions<T> {
  transform?: (data: T) => T;
  onError?: (response: Response) => void;
}

export interface ResourceResult<T> {
  data: Signal<T | undefined>;
  loading: Signal<boolean>;
  error: Signal<Error | undefined>;
  fetch: () => Promise<void>;
}
