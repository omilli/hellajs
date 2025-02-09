import { GenericPromise } from "../global";
import { Signal } from "../reactive";

export interface ResourceHella {
  cache: Map<string, ResourceCache>;
  activeRequests: Map<string, AbortController>;
}

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

export interface ResourceUpdateCacheArgs {
  key: string;
  data: any;
  shouldCache: boolean;
}

export interface ResourceSecurity {
  effectDependencies: WeakMap<() => void, Set<Signal<any>>>;
  signalSubscriberCount: WeakMap<Signal<any>, number>;
  maxDependencies: number;
  maxSubscribers: number;
}
