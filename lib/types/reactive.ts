
export type Signal<T> = WriteableSignal<T> | ReadonlySignal<T>;

export interface WriteableSignal<T> extends ReadonlySignal<T> {
  set: SignalSetter<T>;
}

export interface ReadonlySignal<T> {
  (): T;
  subscribe: SignalSubscribe<T>;
  notify: () => void;
}

export type SignalSubscribe<T> = (listener: SignalListener<T>) => SignalUnsubscribe;
export type SignalUnsubscribe = () => void;
export type SignalSetter<T> = (newValue: T | ((prev: T) => T)) => void;
export type SignalListener<T> = (value: T) => void;





