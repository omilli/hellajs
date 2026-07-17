import { scope } from "./internal/core";
import { dispatchError, toError } from "./internal/dispatch";
import type { HellaNode, ComponentFn } from "./types/nodes";

/**
 * Wraps a component function with automatic scope management.
 * Creates a disposal scope that cleans up effects when the component unmounts.
 * Catches render errors and dispatches them through the error handling system.
 * @param fn The component function to wrap
 * @param props Props to pass to the component function
 * @returns HellaNode with attached scope dispose function, or empty fragment on error
 */
export function component(fn: ComponentFn, props: Record<string, unknown>): HellaNode {
  let result!: HellaNode;
  try {
    const dispose = scope(() => result = fn(props) as HellaNode);
    result.componentScope = dispose;
  } catch (e) {
    dispatchError(toError(e), { phase: "render" });
    return { tag: "$", children: [] };
  }
  return result;
}
