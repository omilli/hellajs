import type { ReadonlySignal } from "@hellajs/core";

export type ResourceStatus = "idle" | "loading" | "success" | "error";

export type ResourceOptions<T, K> = {
  key?: () => K;
  enabled?: boolean;
  initialData?: T;
  cacheTime?: number;
  timeout?: number;
  signal?: AbortSignal;
  onSuccess?: (data: T) => void;
  onError?: (err: unknown) => void;
};

export type CacheEntry<T> = {
  data: T;
  timestamp: number;
  cacheTime: number;
  lastAccess: number;
};
export type CacheConfig = {
  maxSize?: number;
  enableLRU?: boolean;
};

export type ResourceErrorCategory = 
  | 'network'
  | 'validation' 
  | 'authorization'
  | 'not_found'
  | 'server'
  | 'client'
  | 'timeout'
  | 'abort'
  | 'unknown';

export interface ResourceError {
  message: string;
  category: ResourceErrorCategory;
  statusCode?: number;
  originalError?: unknown;
}

export type Resource<T> = {
  data: ReadonlySignal<T | undefined>;
  error: ReadonlySignal<ResourceError | undefined>;
  loading: ReadonlySignal<boolean>;
  status: ReadonlySignal<ResourceStatus>;
  fetch(): void;
  request(): void;
  abort(): void;
  invalidate(): void;
};