import type { Signal, VNode, WriteableSignal } from "./types";

/**
 * Creates a special VNode for inline conditional rendering
 *
 * @param condition - Function that returns a boolean 
 * @param thenBranch - VNode to render when condition is true
 * @param elseBranch - Optional VNode to render when condition is false
 * @returns A special VNode that will be handled by createElement
 */
export function When<T extends VNode>(
  condition: () => boolean,
  thenBranch: T,
  elseBranch?: T
): VNode {
  return {
    __special: "when",
    __condition: condition,
    __thenBranch: thenBranch,
    __elseBranch: elseBranch
  } as unknown as VNode;
}

/**
 * Creates a special VNode for inline list rendering
 * 
 * @param items - Signal containing an array of items
 * @param mapFn - Function to map each item to a VNode
 * @returns A special VNode that will be handled by createElement
 */
export function List<T>(
  items: Signal<T[]>,
  mapFn: (item: WriteableSignal<T>, index: number) => VNode
): VNode {
  return {
    __special: "list",
    __items: items,
    __mapFn: mapFn
  } as unknown as VNode;
}