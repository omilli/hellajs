import { scope } from "./internal/core";
import { dispatchError, toError } from "./error";
import type { HellaNode, ComponentFn } from "./types/nodes.d.ts";

/**
 * Wraps a component function with automatic scope management.
 * Creates a disposal scope that cleans up effects when the component unmounts.
 * Catches render errors and dispatches them through the error handling system.
 * @param componentFn The component function to wrap
 * @param props Props to pass to the component function
 * @returns HellaNode with attached scope dispose function, or empty fragment on error
 */
export function component(componentFn: ComponentFn, props: unknown): HellaNode {
  let result!: HellaNode;
  try {
    const dispose = scope(() => result = componentFn(props as Record<string, unknown>) as HellaNode);
    result.__scope = dispose;
  } catch (e) {
    dispatchError(toError(e), { phase: 'render' });
    return { tag: '$', children: [] };
  }
  return result;
}
