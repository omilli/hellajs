export { ForEach } from "./forEach";
export { Portal } from "./portal";
export { mount } from "./mount";
export { element } from "./element";
export { $ref, type SingleRef } from "./ref";
export { $collection } from "./collection";
export { html } from "./html";
export { component } from "./component";
export { registry } from "./registry";

export type * from "./types/nodes.d.ts";
export type * from "./types/attributes.d.ts";

import type { HellaNode, HellaForEach, HellaPortal } from "./types/nodes.d.ts";
import type { HTMLAttributeMap } from "./types/attributes.d.ts";

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
