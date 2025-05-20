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

export type NestedStore<
  T extends object = {},
  R extends PropertyKey = never
> = {
  [K in keyof T]: T[K] extends object
  ? NestedStore<T[K], Extract<R, keyof T[K]>>
  : K extends Extract<R, K>
  ? ReadonlySignal<T[K]>
  : Signal<T[K]>;
} & {
  computed: () => T;
  set: (value: T) => void;
  update: (partial: PartialDeep<T>) => void;
};

export type Store<
  T extends object = {},
  R extends PropertyKey = never
> = NestedStore<T, R> & {
  cleanup: () => void;
};

export type StoreOptions<T> = {
  readonly?: boolean | (keyof T)[];
};

// Helper to extract readonly keys from options
export type ReadonlyKeys<T, O extends StoreOptions<T> | undefined> =
  O extends { readonly: true }
  ? keyof T
  : O extends { readonly: (infer R)[] }
  ? Extract<R, keyof T>
  : never;

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