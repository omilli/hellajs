export interface Signal<T> {
  (): T;
  set: (value: T) => void;
  cleanup: () => void;
}