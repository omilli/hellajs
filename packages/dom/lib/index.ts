export { ForEach } from "./forEach";
export { Portal } from "./portal";
export { mount } from "./mount";
export { $ref } from "./ref";
export { html } from "./html";
export { componentScope } from "./component";
export * from "./types";

import type { HTMLAttributeMap, HellaNode, HellaForEach, HellaPortal } from "./types";

declare global {
  namespace JSX {
    type Element = HellaNode | HellaForEach | HellaPortal;
    interface IntrinsicElements extends HTMLAttributeMap { }
    interface ElementAttributesProperty {
      props: {};
    }
    interface ElementChildrenAttribute {
      children: {};
    }
  }
}

/** Exporting internals for testing */
export { flushMountQueue, queueCleanup, checkMultiSelectors, multiSelectors } from "./internal";