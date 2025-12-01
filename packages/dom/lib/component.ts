import { scope } from "./internal/core";
import type { HellaNode } from "./types/nodes";

/**
 * Creates automatic scope management for component effects.
 * Used by the Babel plugin and html`` template system for component calls.
 * Use when creating components with pure AST
 * @param componentFn The component function to call
 * @param props The props object to pass to the component
 * @returns HellaNode with attached component scope for cleanup
 */
export function component(componentFn: Function, props: unknown): HellaNode {
  let result!: HellaNode;
  const dispose = scope(() => result = componentFn(props) as HellaNode);
  result.__scope = dispose;
  return result;
}
