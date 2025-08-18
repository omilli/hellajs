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
> = ((value: T) => void) & {
  [K in keyof T]:
  T[K] extends (...args: any[]) => any ? T[K] :
  T[K] extends Record<string, any> ? Store<T[K], R> :
  K extends R ? ReadonlySignal<T[K]> : Signal<T[K]>;
} & {
  computed: () => T;
  update: (partial: PartialDeep<T>) => void;
  cleanup: () => void;
};