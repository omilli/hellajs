import type { VNode } from "./dom";

export type ContextStack<T> = T[];

export interface Context<T> {
  provide: (props: { value: T; children: () => VNode }) => VNode;
  use: () => T;
}


export interface EffectScope {
  registerEffect: (fn: () => void) => void;
  cleanup?: () => void;
}

export interface Signal<T> {
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

export type Resource<T> = {
  data: () => T | undefined;
  error: () => unknown;
  loading: () => boolean;
  status: () => ResourceStatus;
  refetch: () => void;
  reset: () => void;
  invalidate: () => void;
  mutate: (mutator: () => Promise<T>) => Promise<void>;
};

export type CacheEntry<T> = {
  data: T;
  timestamp: number;
};
