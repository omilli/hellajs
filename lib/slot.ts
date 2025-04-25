import { List } from "./list";
import { computed } from "./signal";
import type { VNodeFlatFn, VNode } from "./types";

/**
 * Conditionally renders a virtual node at the specified root selector.
 * This function provides a way to manage conditional rendering based on reactive state.
 *
 * @param vNodeFn - Function that returns a virtual DOM node to be conditionally rendered
 * @param rootSelector - CSS selector string that identifies where in the DOM the node should be rendered
 * @returns A function with _flatten property that evaluates to the result of vNodeFn
 */
export function Slot(vNodeFn: () => VNode, rootSelector?: string | VNode): VNodeFlatFn {
  const comp = computed(() => [vNodeFn()]);
  return List(comp, rootSelector).map(() => vNodeFn());
}
