import type { VNode } from "./dom";

export interface EffectScope {
  registerEffect: (fn: () => void) => void;
  cleanup?: () => void;
}

export interface ReadonlySignal<T> {
  (): T;
  cleanup: () => void;
  subscribe: (fn: () => void) => () => void
  unsubscribe: (fn: () => void) => void
}

export interface Signal<T> extends ReadonlySignal<T> {
  (value?: T): T;
  set: (value: T) => void;
  cleanup: () => void;
  subscribe: (fn: () => void) => () => void
  unsubscribe: (fn: () => void) => void
}

export type CurrentEffect = (() => void) & { subscriptions?: Set<Signal<unknown>> };

export type PartialDeep<T> = {
  [K in keyof T]?: T[K] extends object ? PartialDeep<T[K]> : T[K];
};

export type NestedStore<T extends object = {}> = {
  [K in keyof T]: T[K] extends object ? NestedStore<T[K]> : Signal<T[K]>;
} & {
  computed: () => T;
  set: (value: T) => void;
  update: (partial: PartialDeep<T>) => void;
};

export type Store<T extends object = {}> = NestedStore<T> & {
  cleanup: () => void;
};

export type ResourceStatus = "idle" | "loading" | "success" | "error";

export type ResourceOptions<T, K> = {
  key?: () => K;
  enabled?: boolean;
  initialData?: T;
  cacheTime?: number;
  onSuccess?: (data: T) => void;
  onError?: (err: unknown) => void;
};

export type CacheEntry<T> = {
  data: T;
  timestamp: number;
};

export type Resource<T> = {
  data: ReadonlySignal<T | undefined>;
  error: ReadonlySignal<unknown>;
  loading: ReadonlySignal<boolean>;
  status: ReadonlySignal<ResourceStatus>;
  refetch(): void;
  reset(): void;
  invalidate(): void;
  mutate(mutator: () => Promise<T>): Promise<void>;
};