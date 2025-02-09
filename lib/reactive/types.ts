import { GenericPromise } from "../global";

export interface ReactiveState {
  batchingSignals: boolean;
  activeEffects: Array<() => void>;
  pendingEffects: Set<() => void>;
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

// Resource Args Types
export interface ResourceRequestArgs<T> {
  input: string | GenericPromise<T>;
  options: Required<ResourceOptions<T>>;
  signal: AbortSignal;
}

export interface ResourceJSONArgs {
  url: string;
  onError?: (response: Response) => void;
  signal?: AbortSignal;
}

export interface ResourceCacheArgs {
  key: string;
  maxAge: number;
}

export interface UpdateResourceCacheArgs {
  key: string;
  data: any;
  shouldCache: boolean;
}

// Security

export interface ResourceSecurity {
  effectDependencies: WeakMap<() => void, Set<Signal<any>>>;
  signalSubscriberCount: WeakMap<Signal<any>, number>;
  maxDependencies: number;
  maxSubscribers: number;
}
