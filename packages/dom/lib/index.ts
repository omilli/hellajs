import type { RenderFn, HellaNode } from "./types/nodes";
import type { HTMLAttributeMap } from "./types/attributes";

export { ForEach } from "./ForEach";
export { Portal } from "./Portal";
export { Lazy } from "./Lazy";
export { Transition } from "./Transition";
export { Suspense } from "./Suspense";
export { mount } from "./mount";
export { hydrate } from "./hydrate";
export { element } from "./element";
export { $ref } from "./$ref";
export { $collection } from "./$collection";
export { html } from "./html";
export { component } from "./component";
export { raw } from "./raw";
export { registry } from "./registry";
export { onError } from "./error";

export type * from "./types/nodes";
export type * from "./types/attributes";

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

export { resetDom } from "./internal/reset";
export { getState, hasState, peekState, deleteState } from "./internal/state";
export { checkMultiSelectors, multiSelectors } from "./internal/selectors";