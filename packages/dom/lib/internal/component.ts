import { scope } from "./core";
import type { HellaNode } from "../types";

/**
 * Creates a component with automatic scope management for effects.
 * Used by the Babel plugin and html`` template system for component calls.
 * @param componentFn The component function to call
 * @param props The props object to pass to the component
 * @returns HellaNode with attached component scope for cleanup
 */
export function component(componentFn: Function, props: unknown): HellaNode {
  let result!: HellaNode;
  const dispose = scope(() => result = componentFn(props) as HellaNode);

  if (result && typeof result === 'object' && 'tag' in result)
    result.__componentScope = dispose;

  return result;
}
