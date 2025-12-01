export { ForEach } from "./forEach";
export { Portal } from "./portal";
export { mount } from "./mount";
export { element } from "./element";
export { $ref, type SingleRef } from "./ref";
export { $collection } from "./collection";
export { html } from "./html";
export { component } from "./component";
export { registry } from "./registry";

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

// Testing utilities
export { flushMount, flushCleanup, queueCleanup, checkMultiSelectors, multiSelectors, triggerMutationCallbacks } from "./testing";
