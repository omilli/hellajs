import type { HTMLAttributeMap, VNode } from "./types";

export * from "./cleanup";
export * from "./events";
export * from "./forEach";
export * from "./mount";
export * from "./types";

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