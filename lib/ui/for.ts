import type { Signal } from "../reactive";
import type { VNode } from "../types";

export function For<T>(
  data: Signal<T[]>,
  mapFn: (item: T, index: number) => VNode
) {
  return () => data().map((item, index) => {
    const vNode = mapFn(item, index);
    vNode.__item = item;
    return vNode;
  });
}