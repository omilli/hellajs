import { scope } from "./core";
import type { HellaNode } from "../types";

/**
 * Creates a component with automatic scope management for effects.
 *
 * **Internal use only**: This function is used by the Babel plugin to wrap JSX
 * component calls and by the runtime html`` template system for dynamic components.
 * Users should not call this directly - use JSX or html`` templates instead.
 *
 * @param componentFn The component function to call
 * @param props The props to pass to the component
 * @returns The HellaNode with attached component scope
 */
export function component(componentFn: Function, props: unknown): HellaNode {
  let result!: HellaNode;
  const dispose = scope(() => result = componentFn(props) as HellaNode);

  if (result && typeof result === 'object' && 'tag' in result)
    result.__componentScope = dispose;

  return result;
}
