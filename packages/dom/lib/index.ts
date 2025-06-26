import type { HTMLAttributeMap, VNode } from "./types";

export * from "./css"
export * from "./events";
export * from "./forEach";
export * from "./html";
export * from "./mount";
export * from "./registry";
export * from "./show";
export * from "./types";

declare global {
  namespace JSX {
    type Element = VNode;
    interface IntrinsicElements extends HTMLAttributeMap { }
  }
}