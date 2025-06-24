import { effect } from "@hellajs/core";
import { cleanNodeRegistry, addRegistryEffect } from "./registry";
import { isFunction, resolveNode, isVNode } from "./mount";
import type { VNodeValue } from "./types";

type Cases = Array<[() => unknown, VNodeValue | (() => VNodeValue)] | [VNodeValue | (() => VNodeValue)]>;

export function show(
  when: unknown | (() => unknown),
  is: VNodeValue | (() => VNodeValue),
  not?: VNodeValue | (() => VNodeValue)
): (parent: Node) => void;
export function show(
  ...cases: Cases
): (parent: Node) => void;

export function show(
  ...args: unknown[]
): (parent: Node) => void {
  const cases = normalizeShowArgs(args).map((pair: unknown[]) => {
    if (pair.length === 2) {
      const [cond, content] = pair;
      return [functionise(cond), functionise(content)] as [() => unknown, () => VNodeValue];
    }
    return [functionise(pair[0])] as [() => VNodeValue];
  });

  return (parent: Node) => {
    const placeholder = document.createComment("show-placeholder");
    parent.appendChild(placeholder);

    let currentNodes: Node[] = [];

    const cleanup = effect(() => {
      let content: VNodeValue | undefined;

      for (const pair of cases) {
        if (pair.length === 2) {
          const [cond, contentFn] = pair;
          const result = cond();
          if (!!result) {
            content = contentFn();
            break;
          }
        } else if (pair.length === 1) {
          content = pair[0]();
          break;
        }
      }

      for (const node of currentNodes) {
        if (node.parentNode) {
          cleanNodeRegistry(node);
          node.parentNode.removeChild(node);
        }
      }
      currentNodes = [];

      if (content !== undefined && content !== null) {
        if (isVNode(content) && content.tag === "$") {
          console.warn("Using $ as a tag in show is not supported. Use html instead.");
        } else {
          const newNode = resolveNode(content);
          if (placeholder.parentNode) {
            placeholder.parentNode.insertBefore(newNode, placeholder);
            currentNodes = [newNode];
          }
        }
      }
    });

    addRegistryEffect(parent, cleanup);
  };
}

function normalizeShowArgs(
  args: unknown[]
): Cases {
  if (
    (args.length === 2 || args.length === 3) &&
    (typeof args[0] !== "object" && typeof args[0] !== "function" || isFunction(args[0]))
  ) {
    const [when, is, not] = args;
    const cases: Cases = [
      [isFunction(when) ? when : () => when, is]
    ];
    if (not !== undefined) cases.push([() => true, not]);
    return cases;
  }

  if (args.length > 0 && !Array.isArray(args[args.length - 1])) {
    const arr = args.slice(0, -1) as Cases;
    arr.push([args[args.length - 1]]);
    return arr;
  }

  return args as Cases;
}

function functionise<T>(v: T | (() => T)): () => T {
  return isFunction(v) ? v as () => T : () => v as T;
}