export { forEach } from "./forEach";
export { mount } from "./mount";
export * from "./types";

import type { HTMLAttributeMap, HellaNode } from "./types";
declare global {
  namespace JSX {
    type Element = HellaNode;
    interface IntrinsicElements extends HTMLAttributeMap { }
    interface ElementAttributesProperty {
      props: {};
    }
    interface ElementChildrenAttribute {
      children: {};
    }
  }
}