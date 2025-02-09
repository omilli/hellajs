import { Signal } from "../reactive";

export interface StoreHella {
  stores: WeakMap<
    object,
    {
      store: Set<StoreEffect>;
      effects: Set<() => void>;
    }
  >;
}
export interface StoreOptions {
  readonly?: boolean | Array<string | number | symbol>;
}

export type StoreMethods<T> = {
  [K in keyof T as T[K] extends Function ? K : never]: T[K];
};

export type StoreState<T> = {
  [K in keyof T as T[K] extends Function ? never : K]: T[K];
};

export type StoreEffectFn = (fn: () => void) => () => void;

export type StoreComputed<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any
    ? ReturnType<T[K]>
    : T[K];
};

export type StoreSignals<T> = {
  [K in keyof StoreState<T>]: Signal<StoreState<T>[K]>;
} & StoreMethods<T> & {
    set(
      update:
        | Partial<StoreState<T>>
        | ((storeSignals: StoreSignals<T>) => Partial<StoreState<T>>)
    ): void;
    cleanup(): void;
    computed(): StoreComputed<T>;
  };

export interface StoreBase<T> {
  signals: Map<keyof T, Signal<any>>;
  methods: Map<keyof T, Function>;
  effects: Set<() => void>;
  isDisposed: boolean;
  isInternal: boolean;
}

export type StoreEffect = (key: string | number | symbol, value: any) => void;

export interface StoreUpdateArgs<T> {
  storeBase: StoreBase<T>;
  signals: Map<keyof T, Signal<any>>;
  update:
    | Partial<StoreState<T>>
    | ((store: StoreSignals<T>) => Partial<StoreState<T>>);
}

export interface StoreWithFnArgs<T> {
  storeBase: StoreBase<T>;
  fn: Function;
}

export interface StoreValidatedArgs<T, V> {
  key: keyof T;
  value: V;
  storeBase: StoreBase<T>;
  storeProxy: object;
  options?: StoreOptions;
}
