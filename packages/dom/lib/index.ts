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