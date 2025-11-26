export { forEach } from "./forEach";
export { mount } from "./mount";
export { $ref } from "./ref";
export { html } from "./html";
export { componentScope } from "./component";
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
export { flushMountQueue, queueCleanup, checkMultiPendingSelectors, multiPendingSelectors } from "./internal";