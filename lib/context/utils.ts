import type { Context, GlobalContext, RootContext } from "../types";
import { context } from "./api";
import { CONTEXT_STORE } from "./store";
/**
 * Attempts to return the global `this` object in a way that works across different JavaScript environments,
 * including browsers, Node.js, and web workers.
 *
 * @returns The global `this` object. This could be `globalThis`, `window`, `global`, `self`, or the result of `Function("return this")()`.
 */
export function getGlobalThis(): GlobalContext {
	if (typeof globalThis !== "undefined") return globalThis as GlobalContext;
	if (typeof window !== "undefined") return window as GlobalContext;
	if (typeof global !== "undefined") return global as GlobalContext;
	if (typeof self !== "undefined") return self as GlobalContext;
	return Function("return this")();
}

/**
 * Retrieves the default context from the global scope.
 *
 * This function ensures that a single shared context instance exists in the global scope.
 * If the context doesn't already exist, it creates a new one using the `context()` function
 *
 * @returns The default context instance.
 */
export function getDefaultContext(): Context {
	const key = "hellaDefaultContext";

	if (!CONTEXT_STORE.get(key)) {
		CONTEXT_STORE.set(key, context(key));
	}

	return CONTEXT_STORE.get(key) as Context;
}

/**
 * Retrieves or initializes a root context for the specified selector.
 *
 * @param rootSelector - The selector string identifying the root element
 * @param context - Optional context object (uses default if not provided)
 * @returns The root context associated with the given selector
 */
export function getRootContext(
	rootSelector: string,
	context = getDefaultContext(),
): RootContext {
	const { rootStore } = context.dom;

	if (!rootStore.has(rootSelector)) {
		rootStore.set(rootSelector, {
			events: {
				delegates: new Set(),
				handlers: new Map(),
				listeners: new Map(),
			},
		});
	}

	return rootStore.get(rootSelector) as RootContext;
}
