export { ForEach } from "./forEach";
export { Portal } from "./portal";
export { mount } from "./mount";
export { element } from "./element";
export { $ref } from "./ref";
export { html } from "./html";
export { component } from "./component";
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

/** Exporting internals for testing, do not document */
export { flushMountQueue, queueCleanup, checkMultiSelectors, multiSelectors } from "./internal";