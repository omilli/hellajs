import type { HTMLAttributeMap, VNode } from "./types";

export * from "./events";
export * from "./forEach";
export * from "./hole";
export * from "./mount";
export * from "./registry";
export * from "./slot";
export * from "./types";

declare global {
  namespace JSX {
    type Element = VNode;
    interface IntrinsicElements extends HTMLAttributeMap { }
  }
}