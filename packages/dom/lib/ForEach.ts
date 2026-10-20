import { isHellaNode, resolveValue } from "./internal/utils";
import { isFunction } from "./internal/core";
import { registry } from "./registry";
import { resolveNode, childNamespaceOf } from "./internal/render";
import { popBuildParent, pushBuildParent } from "./internal/state";
import { cleanupSubtree } from "./internal/cleanup";
import { getState } from "./internal/state";
import type { HydrateCtx } from "./internal/hydrate";
import type { HellaNode, HellaChild, ForEachProps } from "./types/nodes";

/**
 * Hydration-context source for the adoption branches below — the hydrate entry
 * (`lib/hydrate.ts`) registers the hydrate walker's context peek here at module init
 * (the `setMountNode` injection pattern: ForEach must not import `internal/hydrate.ts`,
 * which would pin the whole walker into bundles that never hydrate). The default
 * (hydrate not loaded) yields undefined — every list builds fresh.
 */
let peekRegionContext: () => HydrateCtx | undefined = () => undefined;

/**
 * @internal
 * Registers the hydrate walker's context peek for the adoption branches.
 * @param peek Returns the active hydration context, or undefined when not hydrating
 */
export function setForEachHydrateContextSource(peek: () => HydrateCtx | undefined): void {
  peekRegionContext = peek;
}

/**
 * Removes one tracked item from the list parent with full cleanup. Nodes no longer under
 * `parent` (e.g. portal-moved) are left in place.
 */
function removeTrackedItem(item: Node, parent: Element): void {
  if (item.parentNode !== parent) return;
  cleanupSubtree(item);
  parent.removeChild(item);
}

/**
 * Resolves the reconciliation key for one list item: an explicit `key` prop on the rendered node,
 * else the item's `id` property, else the array index (implicit). The first two are explicit
 * identities (reuse by key); the index fallback is positional. The item's `id` is read only when
 * no explicit `key` prop is present, so keyed items never touch it.
 */
function resolveItemKey<T>(
  element: HellaChild,
  item: T,
  index: number,
): { key: unknown; hasExplicitKey: boolean } {
  if (element && isHellaNode(element)) {
    const explicitKey = element.props?.key;
    if (explicitKey !== undefined) return { key: explicitKey, hasExplicitKey: true };
  }
  const id = (item as { id?: unknown })?.id;
  if (id !== undefined) return { key: id, hasExplicitKey: true };
  return { key: index, hasExplicitKey: false };
}

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

    const hctx = peekRegionContext();
    const anchor = hctx ? hctx.anchor : document.createTextNode("");
    if (!hctx) parent.appendChild(anchor);

    /** Clears every live and temp tracking collection — nothing may hold a node after a wipe. */
    const resetTracking = () => {
      keyToNode.clear();
      keyToItem.clear();
      currentKeys.length = 0;
      newKeys.length = 0;
      newKeyToNode.clear();
      newKeyToItem.clear();
      nodesToRemove.length = 0;
    };

    /**
     * Removes every tracked item from the list parent. Fast path: when the region owns the
     * parent's entire child list (tracked nodes plus the anchor), one `replaceChildren(anchor)`
     * replaces N `removeChild` calls — the engine allocates one mutation record instead of N,
     * a full-list clear pays no per-node record or removal cost.
     */
    const removeAllTracked = (listParent: Element) => {
      const tracked = new Set<Node>();
      let iter = keyToNode.values();
      let entry = iter.next();
      while (!entry.done) {
        tracked.add(entry.value);
        entry = iter.next();
      }
      let child = listParent.firstChild as ChildNode | null;
      let ownsParent = true;
      while (child) {
        if (child !== anchor && !tracked.has(child)) {
          ownsParent = false;
          break;
        }
        child = child.nextSibling;
      }
      if (!ownsParent) {
        iter = keyToNode.values();
        entry = iter.next();
        while (!entry.done) {
          removeTrackedItem(entry.value, listParent);
          entry = iter.next();
        }
        return;
      }
      iter = keyToNode.values();
      entry = iter.next();
      while (!entry.done) {
        const item = entry.value;
        if (item.parentNode === listParent) cleanupSubtree(item);
        entry = iter.next();
      }
      listParent.replaceChildren(anchor);
    };

    registry.addEffect(anchor, () => {
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
              const { key } = resolveItemKey(element, item, index);
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
            console.warn(
              `[dom] hydrate mismatch: ForEach region had ${hctx.existingNodes.length} nodes, expected ${arr.length}`,
            );
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
            const { key } = resolveItemKey(element, item, index);
            pushBuildParent(actualParent);
            const node = resolveNode(element, undefined, itemNs);
            popBuildParent();
            if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
              throw new Error("[dom] ForEach: use must return a single element");
            }
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
          const { key, hasExplicitKey } = resolveItemKey(element, item, index);

          newKeys.push(key);

          let node = keyToNode.get(key);
          const oldItem = keyToItem.get(key);
          if (!node || (!hasExplicitKey && oldItem !== item)) {
            pushBuildParent(actualParent);
            const resolved = resolveNode(element, undefined, itemNs);
            popBuildParent();
            if (resolved.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
              throw new Error("[dom] ForEach: use must return a single element");
            }
            node = resolved;
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
          removeTrackedItem(nodesToRemove[ri]!, actualParent);
          ri++;
        }
        nodesToRemove.length = 0;

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

            let left = 0,
              right = tails.length;

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
      } else {
        removeAllTracked(actualParent);
        resetTracking();
      }
    });

    // anchor-owned lifecycle: the component's own text anchor carries the effect + this disposer,
    // so a reactive getter switching away from the list removes its output (removeTrackedItem per
    // item against the live parent) and disposes the effect (clean/drainAnchorCleanup on the anchor)
    getState(anchor).forEachCleanup = () => {
      const liveParent = anchor.parentNode;
      if (liveParent) removeAllTracked(liveParent as Element);
      resetTracking();
    };
  }) as JSX.Element;

  fn.isDynamic = true;
  fn.ssr = { kind: "forEach", props };
  return fn;
}
