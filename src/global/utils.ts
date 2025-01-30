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

export function weakMapLoop<K extends object, V>(
  map: WeakMap<K, V>,
  callback: (value: V, key: K) => void
): void {
  const refs = new FinalizationRegistry(() => {});
  const keys: K[] = [];

  (globalThis as any).gc?.();
  document.querySelectorAll("*").forEach((el) => {
    if (el instanceof HTMLElement && map.has(el as unknown as K)) {
      keys.push(el as unknown as K);
      refs.register(el, null);
    }
  });

  keys.forEach((key) => {
    const value = map.get(key);
    if (value) callback(value, key);
  });
}
