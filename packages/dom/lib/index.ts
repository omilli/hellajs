export { forEach } from "./forEach";
export { mount } from "./mount";
export * from "./types";

import type { HTMLAttributeMap, VNode } from "./types";
declare global {
  namespace JSX {
    type Element = VNode;
    interface IntrinsicElements extends HTMLAttributeMap { }
    interface ElementAttributesProperty {
      props: {};
    }
    interface ElementChildrenAttribute {
      children: {};
    }
  }
}

/**
 * TypeScript syntax sugar for resolve:prop in TSX files
 * 
 * Usage: <Foo value={resolve(bar(1))} />
 * This is equivalent to resolve:value={bar()} in regular JSX
 * 
 * The resolve function is purely a pass-through that forwards
 * the value and its type without any transformation.
 */
export function resolve<T>(value: T): T {
  return value;
}