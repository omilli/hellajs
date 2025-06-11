import { effect, pushScope, popScope } from "@hellajs/core";
import { cleanNodeRegistry } from "./registry";
import { isFunction, resolveNode } from "./mount";
import type { VNode, VNodeValue } from "./types";

type Cases = Array<[() => unknown, VNodeValue | (() => VNodeValue)] | [VNodeValue | (() => VNodeValue)]>;

export function show(
  when: unknown | (() => unknown),
  is: VNodeValue | (() => VNodeValue),
  not?: VNodeValue | (() => VNodeValue)
): VNode;
export function show(
  ...cases: Cases
): VNode;

export function show(
  ...args: unknown[]
): VNodeValue {
  const cases = normalizeShowArgs(args).map((pair: unknown[]) => {
    if (pair.length === 2) {
      const [cond, content] = pair;
      return [cond, functionise(content)] as [() => unknown, () => VNodeValue];
    }
    return [functionise(pair[0])] as [() => VNodeValue];
  });

  let allStatic = cases.every(pair =>
    pair.length === 1
      ? !isFunction(pair[0])
      : !isFunction(pair[0]) && !isFunction(pair[1])
  );

  if (allStatic) {
    for (const pair of cases) {
      if (pair.length === 2) {
        const [cond, content] = pair;
        if (!!(isFunction(cond) ? cond() : cond)) {
          return content();
        }
      } else if (pair.length === 1) {
        return pair[0]();
      }
    }
    return null;
  }

  return (parent: Node) => {
    let currentNode: Node | null = null;
    let cleanupSubtree: (() => void) | null = null;

    const placeholder = document.createComment("show");
    parent.appendChild(placeholder);

    effect(() => {
      let value: VNodeValue | undefined;
      for (const pair of cases) {
        if (pair.length === 2) {
          const [cond, content] = pair;
          const result = isFunction(cond) ? cond() : cond;
          if (!!result) {
            value = content();
            break;
          }
        } else if (pair.length === 1) {
          value = pair[0]();
          break;
        }
      }

      if (currentNode && currentNode.parentNode) {
        cleanNodeRegistry(currentNode);
        currentNode.parentNode.replaceChild(placeholder, currentNode);
        currentNode = null;
      }

      if (cleanupSubtree) {
        cleanupSubtree();
        cleanupSubtree = null;
      }

      let node: Node | null = null;
      let registryCleanup: (() => void) | null = null;

      if (value !== undefined) {
        pushScope({
          registerEffect: (cleanup: () => void) => {
            registryCleanup = cleanup;
          }
        });

        node = resolveNode(value);

        popScope();

        if (node && placeholder.parentNode) {
          placeholder.parentNode.replaceChild(node, placeholder);
          currentNode = node;
        }

        cleanupSubtree = () => {
          if (node) cleanNodeRegistry(node);
          if (registryCleanup) registryCleanup();
        };
      }
    });
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
      [functionise(when), is]
    ];
    if (not !== undefined) cases.push([() => true, not]);
    return cases;
  }

  // If the last argument is not an array, treat it as the default VNode
  if (args.length > 0 && !Array.isArray(args[args.length - 1])) {
    const arr = args.slice(0, -1) as Cases;
    arr.push([functionise(args[args.length - 1])]);
    return arr;
  }

  return args as Cases;
}

function functionise<T>(v: T | (() => T)): () => T {
  return isFunction(v) ? v as () => T : () => v as T;
}