export { forEach } from "./forEach";
export { mount } from "./mount";
export { element, elements } from "./element";
export { html } from "./html";
export { component } from "./component";
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

/** Exporting internals for testing */
export { flushPendingSelectors, flushMountQueue, getPendingCount, clearPendingSelectors, queueCleanup } from "./internal";