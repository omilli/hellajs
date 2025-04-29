import type { Signal } from "../types";

export const isString = (value: unknown): value is string =>
	typeof value === "string";
export const isNumber = (value: unknown): value is number =>
	typeof value === "number";
export const isBoolean = (value: unknown): value is boolean =>
	typeof value === "boolean";
export const isFunction = (value: unknown): value is Function =>
	typeof value === "function";
export const isObject = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;
export const isArray = (value: unknown): value is unknown[] =>
	Array.isArray(value);
export function isVNodeString(value: unknown): value is string {
	return isString(value) || isNumber(value);
}
export function isSignal(value: unknown): value is Signal<unknown> {
	return (
		isFunction(value) &&
		typeof (value as { subscribe?: unknown }).subscribe === "function"
	);
}
