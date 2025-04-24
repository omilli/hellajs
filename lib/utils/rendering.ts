import { computed } from "../signal";
import { render } from "../render";
import type { Signal, VNode, WriteableSignal } from "../types";

/**
 * Renders a reactive condition to a DOM element.
 * The provided function will be re-evaluated when its dependencies change.
 * 
 * @param vNodeFn - Function that returns a VNode based on reactive state
 * @param rootSelector - CSS selector for the container element
 * @returns Cleanup function to remove event listeners and subscriptions
 */
export function condition(vNodeFn: () => VNode, rootSelector: string): () => void {
  const computedVNode = computed(() => [vNodeFn()]);
  const result = render(computedVNode, rootSelector);
  result.map(item => item());
  return result.cleanup;
}

/**
 * Renders a reactive list to a DOM element.
 * The provided mapping function will transform each item into a VNode.
 * 
 * @param items - Signal containing an array of items
 * @param mapFn - Function to map each item to a VNode
 * @param rootSelector - CSS selector for the container element
 * @returns Cleanup function to remove event listeners and subscriptions
 */
export function list<T>(
  items: Signal<T[]>,
  mapFn: (item: WriteableSignal<T>, index: number) => VNode,
  rootSelector: string
): () => void {
  const result = render(items, rootSelector);
  result.map(mapFn);
  return result.cleanup;
}
