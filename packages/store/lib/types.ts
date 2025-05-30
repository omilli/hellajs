import type { ReadonlySignal, Signal } from "@hellajs/core";

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

export type ReadonlyKeys<T, O extends StoreOptions<T> | undefined> =
  O extends { readonly: true }
  ? keyof T
  : O extends { readonly: (infer R)[] }
  ? Extract<R, keyof T>
  : never;
