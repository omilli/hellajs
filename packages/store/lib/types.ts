import type { ReadonlySignal, Signal } from "@hellajs/core";

export type PartialDeep<T> = {
  [K in keyof T]?: T[K] extends object ? PartialDeep<T[K]> : T[K];
};

export type StoreOptions<T> = {
  readonly?: boolean | readonly (keyof T)[];
};

export type ReadonlyKeys<T, O extends StoreOptions<T> | undefined> =
  O extends { readonly: true }
  ? keyof T
  : O extends { readonly: readonly (keyof T)[] }
  ? O["readonly"][number]
  : never;

// Simplified Store mapping: functions preserved, objects become nested Store, primitives become Signal/ReadonlySignal
export type Store<
  T extends Record<string, any> = {},
  R extends PropertyKey = never
> = {
  [K in keyof T]:
  T[K] extends (...args: any[]) => any ? T[K] :
  T[K] extends any[] ? K extends R ? ReadonlySignal<T[K]> : Signal<T[K]> :
  T[K] extends Record<string, any> ? 
    T[K] extends any[] ? K extends R ? ReadonlySignal<T[K]> : Signal<T[K]> :
    Store<T[K], R> :
  K extends R ? ReadonlySignal<T[K]> : Signal<T[K]>;
} & {
  computed: ReadonlySignal<T>;
  set: (value: T) => void;
  update: (partial: PartialDeep<T>) => void;
  cleanup: () => void;
};