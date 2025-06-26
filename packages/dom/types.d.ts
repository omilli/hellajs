import type { HTMLAttributeMap, VNode } from "./lib/types";

declare global {
  namespace JSX {
    type Element = VNode;
    interface IntrinsicElements extends HTMLAttributeMap { }
  }
}

export * from "./dist/css"
export * from "./dist/events";
export * from "./dist/forEach";
export * from "./dist/html";
export * from "./dist/mount";
export * from "./dist/registry";
export * from "./dist/show";
export * from "./dist/types";