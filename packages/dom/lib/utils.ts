import type { VNode } from "./types";

export const DOC = document;

export function isText(vNode: unknown): vNode is string | number {
  return typeof vNode === "string" || typeof vNode === "number";
}

export function isFunction(vNode: unknown): vNode is (...args: unknown[]) => unknown {
  return typeof vNode === "function";
}

export function isVNode(vNode: unknown): vNode is VNode {
  return (vNode && typeof vNode === "object" && (vNode as VNode).tag) as boolean;
}

export function isFragment(value: unknown): value is DocumentFragment {
  return value instanceof DocumentFragment;
}

export function isNode(value: unknown): value is Node {
  return value instanceof Node;
}
