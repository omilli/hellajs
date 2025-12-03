import type { Signal } from "@hellajs/core";

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

// Simplified Store mapping: functions preserved, objects become nested Store, primitives become Signal/function
export type Store<
  T extends Record<string, unknown> = Record<string, never>,
  R extends PropertyKey = never
> = {
  [K in keyof T]:
  T[K] extends (...args: unknown[]) => unknown ? T[K] :
  T[K] extends unknown[] ? K extends R ? () => T[K] : Signal<T[K]> :
  T[K] extends Record<string, unknown> ?
  T[K] extends unknown[] ? K extends R ? () => T[K] : Signal<T[K]> :
  Store<T[K], R> :
  K extends R ? () => T[K] : Signal<T[K]>;
} & {
  snapshot: () => T;
  set: (value: T) => void;
  update: (partial: PartialDeep<T>) => void;
  cleanup: () => void;
};