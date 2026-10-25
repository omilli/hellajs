import type { RenderFn, HellaNode } from "./types/nodes";
import type { TemplateBuildFn } from "./runtime";
import type { HTMLAttributeMap } from "./types/attributes";

export type { TemplateBuildFn } from "./runtime";

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
export { component } from "./component";
export { raw } from "./raw";
export { registry } from "./registry";
export { onError } from "./error";
export { trapFocus } from "./trapFocus";
export { onEscape } from "./onEscape";
export { onOutside } from "./onOutside";
export { rovingTabIndex } from "./rovingTabIndex";
export { anchorPosition } from "./anchorPosition";
export { computeAnchorPosition } from "./computeAnchorPosition";
export { hoverIntent } from "./hoverIntent";
export { menuTypeahead } from "./menuTypeahead";
export { onDrag } from "./onDrag";
export { onSwipe } from "./onSwipe";
export { onPinch } from "./onPinch";
export { onLongPress } from "./onLongPress";
export { onDoubleTap } from "./onDoubleTap";
export { layerDismissal } from "./layerDismissal";

export type * from "./types/nodes";
export type * from "./types/attributes";
export type * from "./types/behaviors";

declare global {
  namespace JSX {
    // The intersection serves both compile targets from one JSX type: HellaNode is the
    // ast target's (and @hellajs/ssr's) view, the TemplateBuildFn call shape is what the
    // dom target's emission actually produces (mount/hydrate accept only that — hand-built
    // plain HellaNode objects stay non-assignable, the flip's compile-time rejection).
    type Element = HellaNode & RenderFn & TemplateBuildFn;
    interface IntrinsicElements extends HTMLAttributeMap {}
    interface ElementAttributesProperty {
      props: {};
    }
    interface ElementChildrenAttribute {
      children: {};
    }
  }
}

export { resetDom } from "./internal/reset";
export { queueCounts } from "./internal/queue";
export { getState, hasState, peekState, deleteState } from "./internal/state";
export { checkMultiSelectors, multiSelectors } from "./internal/selectors";
