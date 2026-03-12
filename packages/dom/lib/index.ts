export { ForEach } from "./ForEach";
export { Portal } from "./Portal";
export { Lazy } from "./Lazy";
export { mount } from "./mount";
export { element } from "./element";
export { $ref } from "./$ref";
export { $collection } from "./$collection";
export { html } from "./html";
export { component } from "./component";
export { registry } from "./registry";
export { onError, clearErrorHandlers } from "./error";
export type { ErrorContext, ErrorHandler } from "./error";

export type * from "./types/nodes";
export type * from "./types/attributes";

import type { RenderFn, HellaNode } from "./types/nodes";
import type { HTMLAttributeMap } from "./types/attributes";

declare global {
  namespace JSX {
    type Element = HellaNode & RenderFn;
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
export { flushMount, queueCleanup, checkMultiSelectors, multiSelectors, triggerMutationCallbacks } from "./internal/testing";
