import type { Signal } from "../reactive";
import type { VNode } from "../types";

/**
 * Iterates over a reactive array (`Signal<T[]>`) and maps each item to a VNode using the provided mapping function.
 * 
 * @template T - The type of items in the array.
 * @param data - A reactive signal containing an array of items to iterate over.
 * @param mapFn - A function that maps each item and its index to a VNode.
 * @returns A function that, when called, returns an array of VNodes.
 */
export function list<T>(
  data: Signal<T[]>,
  mapFn: (item: T, index: number) => VNode
) {
  return () => data().map((item, index) => {
    const vNode = mapFn(item, index);
    vNode._item = item;
    return vNode;
  });
}