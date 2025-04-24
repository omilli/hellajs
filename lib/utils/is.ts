import type { Signal } from "../types";

export const isString = (value: unknown): value is string => typeof value === "string";
export const isNumber = (value: unknown): value is number => typeof value === "number";
export const isBoolean = (value: unknown): value is boolean => typeof value === "boolean";
export const isFunction = (value: unknown): value is Function => typeof value === "function";
export const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;
export const isArray = (value: unknown): value is unknown[] => Array.isArray(value);
export function isVNodeString(value: unknown): boolean {
  return isString(value) || isNumber(value);
}
export const isSignal = (value: unknown) => typeof isFunction(value) && Object.hasOwn(value as Signal<unknown>, "subscribe");