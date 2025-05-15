import { effect, pushScope, popScope } from "../reactive";
import { cleanNodeRegistry } from "./registry";
import { isFunction, resolveNode } from "./mount";
import type { VNodeValue } from "../types";

export function show(
  when: boolean | (() => boolean),
  is: VNodeValue | (() => VNodeValue),
  not?: VNodeValue | (() => VNodeValue)
): Node;
export function show(
  ...cases: Array<[() => boolean, VNodeValue | (() => VNodeValue)] | [VNodeValue | (() => VNodeValue)]>
): Node;

export function show(
  ...args: any[]
): Node {
  const cases = normalizeShowArgs(args).map((pair: any[]) => {
    if (pair.length === 2) {
      const [cond, content] = pair;
      return [cond, functionise(content)] as [() => boolean, () => VNodeValue];
    }
    return [functionise(pair[0])] as [() => VNodeValue];
  });

  let currentNode: Node | null = null;
  let cleanupSubtree: (() => void) | null = null;

  const placeholder = document.createComment("show");
  const fragment = document.createDocumentFragment();
  fragment.append(placeholder);

  effect(() => {
    let value: VNodeValue | undefined;
    for (const pair of cases) {
      if (pair.length === 2) {
        const [cond, content] = pair;
        const result = isFunction(cond) ? cond() : cond;
        if (result) {
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

  return fragment;
}

function normalizeShowArgs(
  args: any[]
): Array<[() => boolean, VNodeValue | (() => VNodeValue)] | [VNodeValue | (() => VNodeValue)]> {
  if (
    (args.length === 2 || args.length === 3) &&
    (typeof args[0] === "boolean" || isFunction(args[0]))
  ) {
    const [when, is, not] = args;
    const cases: Array<[() => boolean, VNodeValue | (() => VNodeValue)] | [VNodeValue | (() => VNodeValue)]> = [
      [functionise(when) as () => boolean, is]
    ];
    if (not !== undefined) cases.push([() => true, not]);
    return cases;
  }

  return args;
}

function functionise<T>(v: T | (() => T)): () => T {
  return isFunction(v) ? v as () => T : () => v as T;
}