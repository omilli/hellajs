import type { HellaNode, ErrorConfig, ErrorContext } from "../types/nodes";

/**
 * @internal
 * Registered mountNode function from mount.ts, used for reset and fallback rendering.
 */
let mountNodeFn: ((node: HellaNode) => Node) | null = null;

/**
 * Clears all registered error handlers. The default (errors feature not loaded) does
 * nothing — the handler set only exists when the feature does.
 *
 * Exported `let` is deliberate: swapped at module init by the errors feature via
 * {@link setErrorDispatch} while every importer keeps the live binding.
 */
export let resetErrorState: () => void = () => {};

/**
 * @internal
 * Dispatches an error for UI handling. The default is the no-feature path — log and
 * continue without a UI change; the errors feature (`lib/features/errors.ts`, loaded by
 * `lib/error.ts` or `error:` JSX via the babel plugin) installs boundary detection,
 * handler iteration, and fallback rendering.
 *
 * Exported `let` is deliberate: the feature swaps the implementation at module init
 * through {@link setErrorDispatch} (the `setMountNode` injection pattern) while every
 * importer keeps the live binding.
 * @param error The error that occurred
 * @param context The error context with phase, element, and event info
 * @returns Fallback HellaNode to render, or null for no UI change
 */
export let dispatchError: (error: Error, context: ErrorContext) => HellaNode | null = (error) => {
  console.error("[dom]", error);
  return null;
};

/**
 * @internal
 * Finds the nearest error boundary element by walking up the DOM tree. The default
 * (errors feature not loaded) finds none — boundary configs only exist when the
 * feature does.
 * @param origin The element where the error occurred
 * @returns The boundary element, or null if none found
 */
export let findBoundary: (origin: Element | undefined) => Element | null = () => null;

/**
 * @internal
 * Resolves error config by walking up the DOM tree. The default (errors feature not
 * loaded) resolves none.
 * @param origin The element where the error occurred
 * @returns The error config, or undefined if none found
 */
export let resolveErrorConfig: (origin: Element) => ErrorConfig | undefined = () => undefined;

/**
 * The errors feature's dispatch implementations, registered at its module init.
 */
interface ErrorDispatch {
  dispatchError: (error: Error, context: ErrorContext) => HellaNode | null;
  findBoundary: (origin: Element | undefined) => Element | null;
  resolveErrorConfig: (origin: Element) => ErrorConfig | undefined;
  resetErrorState: () => void;
}

/**
 * @internal
 * Registers the errors feature's dispatch machinery (the `setMountNode` injection
 * pattern — the implementations live in `lib/features/errors.ts` so unused error
 * wiring tree-shakes out of bundles that never load the feature).
 * @param impl The error dispatch implementations
 */
export function setErrorDispatch(impl: ErrorDispatch): void {
  dispatchError = impl.dispatchError;
  findBoundary = impl.findBoundary;
  resolveErrorConfig = impl.resolveErrorConfig;
  resetErrorState = impl.resetErrorState;
}

/**
 * @internal
 * Registers the mountNode function from mount.ts.
 * Called once during module initialization to enable reset functionality.
 * @param fn The mountNode function
 */
export function setMountNode(fn: (node: HellaNode) => Node): void {
  mountNodeFn = fn;
}

/**
 * @internal
 * Returns the registered mountNode function.
 * Used by events.ts to render fallback UI.
 */
export function getMountNode(): ((node: HellaNode) => Node) | null {
  return mountNodeFn;
}

/**
 * @internal
 * Normalizes any thrown value to an Error object.
 * @param e The thrown value
 * @returns Error object
 */
export function toError(e: unknown): Error {
  return e instanceof Error ? e : new Error(String(e));
}
