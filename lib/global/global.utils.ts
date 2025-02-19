import { isSignal } from "../reactive";

export function kebabCase(str: string): string {
  return str.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

export function isTrue(value: any): boolean {
  return value === true;
}

export function isFalse(value: any): boolean {
  return value === false;
}

export function isUndefined(value: any): boolean {
  return value === undefined;
}

export function isNull(value: any): boolean {
  return value === null;
}

export function isFalsy(value: any): boolean {
  return isNull(value) || isUndefined(value) || isFalse(value);
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

export function isBoolean(value: any): value is boolean {
  return typeof value === "boolean";
}

export function isAbortError(error: any): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export function toError(error: any): Error {
  return error instanceof Error ? error : new Error(String(error));
}

export function createTimeout(ms: number): Promise<never> {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Request timeout")), ms)
  );
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
