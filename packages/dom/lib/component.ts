import { scope } from "./internal/core";
import { dispatchError, toError } from "./internal/dispatch";
import { chainScopes } from "./internal/utils";
import type { HellaNode, ComponentReturn } from "./types/nodes";

/**
 * Wraps a component function with automatic scope management.
 * Creates a disposal scope that cleans up effects when the component unmounts.
 * Catches render errors and dispatches them through the error handling system.
 * @param fn The component function to wrap
 * @param props Props to pass to the component function
 * @returns HellaNode with attached scope dispose function, or empty fragment on error
 */
export function component<P extends Record<string, unknown>>(fn: (props: P) => ComponentReturn, props: P): HellaNode {
  let result!: HellaNode;
  try {
    const dispose = scope(() => result = fn(props) as HellaNode);
    // A `static` root is shared by reference across invocations of the same template
    // (cloneWithValues returns it as-is) — wrap it so each instance carries its own
    // componentScope instead of mutating the shared node (last call would win).
    if (result.static) result = { ...result };
    // The spread (static root) or a direct return of another component's wrapper can
    // carry an inner component's scope — chain onto it, never overwrite.
    result.componentScope = chainScopes(result.componentScope, dispose);
  } catch (e) {
    dispatchError(toError(e), { phase: "render" });
    return { tag: "$", children: [] };
  }
  return result;
}
