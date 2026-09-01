import { isHellaNode, resolveValue } from "./internal/utils";
import { isFunction } from "./internal/core";
import { registry } from "./registry";
import { resolveNode, childNamespaceOf } from "./internal/render";
import { cleanupSubtree } from "./internal/cleanup";
import { peekHydrateContext } from "./internal/hydrate";
import type { HellaNode, ForEachProps } from "./types/nodes";

/**
 * Renders and updates a list of items using keyed reconciliation.
 * Uses LIS algorithm to minimize DOM moves with multiple fast paths for optimal performance.
 * @template T
 * @param props Component props with each and use
 * @returns Function that mounts the list into a parent element
 * @throws {Error} When props.each is missing or props.use is not a function.
 */
export function ForEach<T>(props: ForEachProps<T>): JSX.Element {
  if (!props.each) throw new Error("[dom] ForEach: each is required");
  if (!isFunction(props.use)) throw new Error("[dom] ForEach: use must be a function");
  const { each, use } = props;
  const fn = ((parent: Element) => {
    let keyToNode = new Map<unknown, Node>(),
      keyToItem = new Map<unknown, T>(),
      currentKeys: unknown[] = [];

    let newKeys: unknown[] = [];
    let newKeyToNode = new Map<unknown, Node>();
    let newKeyToItem = new Map<unknown, T>();
    const nodesToRemove: Node[] = [];
    const keyToOldIndex = new Map<unknown, number>();
    const toMove = new Set<number>();

    const hctx = peekHydrateContext();
    const anchor = hctx ? hctx.anchor : document.createTextNode("");
    if (!hctx) parent.appendChild(anchor);

    registry.addEffect(parent, () => {
      const actualParent = anchor.parentNode as Element;
      if (!actualParent) return;
      const itemNs = childNamespaceOf(actualParent);

      const arr: T[] = resolveValue(each) as T[];

      if (arr.length > 0) {
        if (currentKeys.length === 0) {
          if (hctx && hctx.existingNodes.length === arr.length) {
            // hydrate adoption: reuse the marker-gathered server nodes, no fresh build
            let index = 0;
            const arrLen = arr.length;
            while (index < arrLen) {
              const item = arr[index]!;
              const element = use(item, index);
              const key = element && isHellaNode(element)
                ? element.props?.key ?? (item as { id?: unknown })?.id ?? index
                : (item as { id?: unknown })?.id ?? index;
              const existing = hctx.existingNodes[index]!;
              if (element && isHellaNode(element) && (element as HellaNode).tag !== "$") {
                hctx.hydrateNode(element as HellaNode, existing);
              }
              keyToNode.set(key, existing);
              keyToItem.set(key, item);
              currentKeys.push(key);
              index++;
            }
            return;
          }
          if (hctx) {
            // count mismatch (server/client divergence) — warn, clear the region's server nodes, fresh-build
            console.warn(`[dom] hydrate mismatch: ForEach region had ${hctx.existingNodes.length} nodes, expected ${arr.length}`);
            let ri = 0;
            const rLen = hctx.existingNodes.length;
            while (ri < rLen) {
              const rem = hctx.existingNodes[ri]!;
              if (rem.parentNode === actualParent) {
                cleanupSubtree(rem);
                actualParent.removeChild(rem);
              }
              ri++;
            }
          }
          const fragment = document.createDocumentFragment();
          const arrLen = arr.length;
          let index = 0;
          while (index < arrLen) {
            const item = arr[index]!;
            const element = use(item, index);
            const key = element && isHellaNode(element)
              ? element.props?.key ?? (item as { id?: unknown })?.id ?? index
              : (item as { id?: unknown })?.id ?? index;
            const node = resolveNode(element, undefined, itemNs);
            fragment.appendChild(node);
            keyToNode.set(key, node);
            keyToItem.set(key, item);
            currentKeys.push(key);
            index++;
          }
          actualParent.insertBefore(fragment, anchor);
          return;
        }

        newKeys.length = 0;
        newKeyToNode.clear();
        newKeyToItem.clear();
        nodesToRemove.length = 0;

        const arrLen = arr.length;
        let index = 0;
        while (index < arrLen) {
          const item = arr[index]!;
          const element = use(item, index);

          let key: unknown;
          let hasExplicitKey = false;
          if (element && isHellaNode(element)) {
            if (element.props?.key !== undefined) {
              key = element.props.key;
              hasExplicitKey = true;
            } else if ((item as { id?: unknown })?.id !== undefined) {
              key = (item as { id?: unknown }).id;
              hasExplicitKey = true;
            } else {
              key = index;
            }
          } else if ((item as { id?: unknown })?.id !== undefined) {
            key = (item as { id?: unknown }).id;
            hasExplicitKey = true;
          } else {
            key = index;
          }

          newKeys.push(key);

          let node = keyToNode.get(key);
          const oldItem = keyToItem.get(key);
          if (!node || (!hasExplicitKey && oldItem !== item)) {
            node = resolveNode(element, undefined, itemNs);
          }
          newKeyToNode.set(key, node);
          newKeyToItem.set(key, item);
          index++;
        }

        const existingEntries = Array.from(keyToNode.entries());
        let ki = 0;
        const kLen = existingEntries.length;
        while (ki < kLen) {
          const [key, node] = existingEntries[ki++]!;
          if (node.parentNode !== actualParent) continue;
          const newNode = newKeyToNode.get(key);
          (!newNode || newNode !== node) && nodesToRemove.push(node);
        }

        let ri = 0;
        const rLen = nodesToRemove.length;
        while (ri < rLen) {
          const rNode = nodesToRemove[ri]!;
          cleanupSubtree(rNode);
          actualParent.removeChild(rNode);
          ri++;
        }

        let hasMatchingKey = false;
        const newKeysLen = newKeys.length;
        let k = 0;
        while (k < newKeysLen) {
          if (keyToNode.has(newKeys[k])) {
            hasMatchingKey = true;
            break;
          }
          k++;
        }
        if (!hasMatchingKey && newKeysLen > 0) {
          const fragment = document.createDocumentFragment();
          let fi = 0;
          const fLen = newKeys.length;
          while (fi < fLen) {
            fragment.appendChild(newKeyToNode.get(newKeys[fi]!)!);
            fi++;
          }
          actualParent.insertBefore(fragment, anchor);
        } else {
          keyToOldIndex.clear();
          toMove.clear();
          const currentKeysLen = currentKeys.length,
            curKeysLen = newKeys.length;
          let i = 0;
          while (i < curKeysLen) {
            toMove.add(i);
            i++;
          }

          i = 0;
          while (i < currentKeysLen) {
            keyToOldIndex.set(currentKeys[i], i);
            i++;
          }

          const mapped = new Array(curKeysLen);
          i = 0;
          while (i < curKeysLen) {
            const key = newKeys[i];
            const oldNode = keyToNode.get(key);
            const newNode = newKeyToNode.get(key);
            mapped[i] = oldNode && oldNode === newNode ? (keyToOldIndex.get(key) ?? -1) : -1;
            i++;
          }

          const n = mapped.length;
          const tails: number[] = [];
          const prevIndices = new Array(n).fill(-1);
          let keyIndexed = 0;

          while (keyIndexed < n) {
            if (mapped[keyIndexed] === -1) {
              keyIndexed++;
              continue;
            }

            let left = 0, right = tails.length;

            while (left < right) {
              const mid = Math.floor((left + right) / 2);
              if (mapped[tails[mid]!] < mapped[keyIndexed]) {
                left = mid + 1;
              } else {
                right = mid;
              }
            }

            left > 0 && (prevIndices[keyIndexed] = tails[left - 1]);

            if (left === tails.length) {
              tails.push(keyIndexed);
            } else {
              tails[left] = keyIndexed;
            }
            keyIndexed++;
          }

          const lis: number[] = [];
          if (tails.length > 0) {
            let curr = tails[tails.length - 1]!;
            while (curr !== -1) {
              lis.unshift(curr);
              curr = prevIndices[curr]!;
            }
          }

          const lisLen = lis.length;
          let j = 0;
          while (j < lisLen) {
            toMove.delete(lis[j]!);
            j++;
          }

          let moveAnchor: Node | null = anchor;
          i = newKeys.length - 1;

          while (i >= 0) {
            const node = newKeyToNode.get(newKeys[i])!;
            toMove.has(i) && actualParent.insertBefore(node, moveAnchor);
            moveAnchor = node;
            i--;
          }
        }

        const tempNode = keyToNode;
        const tempItem = keyToItem;
        const tempKeys = currentKeys;
        keyToNode = newKeyToNode;
        keyToItem = newKeyToItem;
        currentKeys = newKeys;
        newKeyToNode = tempNode;
        newKeyToItem = tempItem;
        newKeys = tempKeys;
      }
      else {
        const entries = Array.from(keyToNode.entries());
        let ei = 0;
        const eLen = entries.length;
        while (ei < eLen) {
          const [, node] = entries[ei++]!;
          if (node.parentNode === actualParent) {
            cleanupSubtree(node);
            actualParent.removeChild(node);
          }
        }

        keyToNode.clear();
        keyToItem.clear();
        currentKeys.length = 0;
      }
    });
  }) as JSX.Element;

  fn.isDynamic = true;
  fn.ssr = { kind: "forEach", props };
  return fn;
}
