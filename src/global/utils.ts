import { isSignal } from "../reactive";

export function kebabCase(str: string): string {
  return str.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

export function isPrimitive(value: any): value is string | number {
  return isString(value) || isNumber(value);
}

export function isObject(value: any): value is Object {
  return typeof value === "object";
}

export function isRecord(value: any): value is Object {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function isFunction(value: any): value is Function {
  return typeof value === "function";
}

export function isString(type: any): type is string {
  return typeof type === "string";
}

export function isNumber(type: any): type is number {
  return typeof type === "number";
}

export function isReactiveProp(value: any): boolean {
  return isSignal(value) || typeof value === "function";
}

export function debounceRaf<T extends (...args: any[]) => void>(
  fn: T
): (...args: Parameters<T>) => void {
  const state = new Map<string, number>();

  return (...args) => {
    const key = JSON.stringify(args);
    if (state.has(key)) {
      cancelAnimationFrame(state.get(key)!);
    }

    state.set(
      key,
      requestAnimationFrame(() => {
        fn(...args);
        state.delete(key);
      })
    );
  };
}
