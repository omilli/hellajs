import { isFunction } from "@hellajs/core";

/** Property names reserved by the store implementation */
export const reservedKeys = new Set(["computed", "snapshot", "set", "update", "cleanup"]);

export const isObject = (value: unknown): value is object =>
  typeof value === "object" && value !== null;

export const isObjectOrFunction = (value: unknown): boolean =>
  isObject(value) || isFunction(value);

export const applyUpdate = (
  target: unknown,
  value: unknown,
  middlewares: Record<string, unknown> | undefined,
  key: string
) => {
  if (!target) return;
  const middleware = middlewares?.[key];
  const processedValue = middleware
    ? (middleware as (v: unknown) => unknown)(value)
    : value;

  if (isFunction(target)) {
    target(processedValue);
  }
};

export const wrapWithMiddleware = (sig: ReturnType<typeof import("@hellajs/core").signal>, middleware: (val: unknown) => unknown) => {
  function wrapped(this: unknown, value?: unknown) {
    if (arguments.length === 0) return sig();
    return sig(middleware(value));
  }
  return wrapped;
};

export const defineStoreProperty = (result: Record<string, unknown>, key: string, value: unknown) =>
  Object.defineProperty(result, key, {
    value,
    writable: true,
    enumerable: true,
    configurable: true,
  });
