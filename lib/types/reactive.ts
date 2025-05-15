import type { VNode, VNodeValue } from "./dom";

export type ContextStack<T> = T[];

export interface Context<T> {
  provide: (props: { value: T; children: () => VNodeValue }) => VNodeValue;
  use: () => T;
}


export interface EffectScope {
  registerEffect: (fn: () => void) => void;
  cleanup?: () => void;
}

export interface Signal<T> {
  (): T;
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