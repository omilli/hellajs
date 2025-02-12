export type DynamicValue<T> = T | (() => T);

export type GenericPromise<T> = () => Promise<T>;

export type CleanupFunction = () => void;
