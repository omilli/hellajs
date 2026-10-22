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
 * Renders and updates a list of items using keyed reconciliation.
 * Trims unchanged prefix/suffix runs, then diffs the middle with LIS to minimize DOM moves.
 * @template T
 * @param props Component props with each and use
 * @returns Function that mounts the list into a parent element
 * @throws {Error} When props.each is missing or props.use is not a function.
 */
export function ForEach<T>(props: ForEachProps<T>): JSX.Element {
  if (!props.each) throw new Error("[dom] ForEach: each is required");
  if (!isFunction(props.use)) throw new Error("[dom] ForEach: use must be a function");
  const { each, use } = props;
  const extractKey = isFunction(props.key) ? props.key : undefined;
  const fn = ((parent: Element) => {
    let keyToNode = new Map<unknown, Node>(),
      keyToItem = new Map<unknown, T>(),
      currentKeys: unknown[] = [];

    let newKeys: unknown[] = [];
    let newExplicit: number[] = [];
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
      newExplicit.length = 0;
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
              let key: unknown;
              const extracted = extractKey !== undefined ? extractKey(item, index) : undefined;
              if (extracted !== undefined) {
                key = extracted;
              } else if (element && isHellaNode(element)) {
                const vnodeKey = element.props?.key;
                if (vnodeKey !== undefined) key = vnodeKey;
              }
              if (key === undefined) {
                const id = (item as { id?: unknown })?.id;
                key = id !== undefined ? id : index;
              }
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
            let key: unknown;
            const extracted = extractKey !== undefined ? extractKey(item, index) : undefined;
            if (extracted !== undefined) {
              key = extracted;
            } else if (element && isHellaNode(element)) {
              const vnodeKey = element.props?.key;
              if (vnodeKey !== undefined) key = vnodeKey;
            }
            if (key === undefined) {
              const id = (item as { id?: unknown })?.id;
              key = id !== undefined ? id : index;
            }
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
        newExplicit.length = 0;
        newKeyToNode.clear();
        newKeyToItem.clear();
        nodesToRemove.length = 0;

        const arrLen = arr.length;
        let index = 0;
        while (index < arrLen) {
          const item = arr[index]!;
          let element: HellaChild | undefined;
          let key: unknown;
          let explicit = false;
          const extracted = extractKey !== undefined ? extractKey(item, index) : undefined;
          if (extracted !== undefined) {
            key = extracted;
            explicit = true;
            // Extractor present: retained keys reuse their live node without re-invoking use.
            if (!keyToNode.has(key)) element = use(item, index);
          } else {
            element = use(item, index);
            if (element && isHellaNode(element)) {
              const vnodeKey = element.props?.key;
              if (vnodeKey !== undefined) {
                key = vnodeKey;
                explicit = true;
              }
            }
            if (key === undefined) {
              const id = (item as { id?: unknown })?.id;
              if (id !== undefined) {
                key = id;
                explicit = true;
              } else {
                key = index;
              }
            }
          }

          let node = keyToNode.get(key);
          if (element !== undefined && (!node || (!explicit && keyToItem.get(key) !== item))) {
            pushBuildParent(actualParent);
            const resolved = resolveNode(element, undefined, itemNs);
            popBuildParent();
            if (resolved.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
              throw new Error("[dom] ForEach: use must return a single element");
            }
            node = resolved;
          }
          newKeys.push(key);
          newExplicit.push(explicit ? 1 : 0);
          newKeyToNode.set(key, node!);
          newKeyToItem.set(key, item);
          index++;
        }

        const iter = keyToNode.entries();
        let entry = iter.next();
        while (!entry.done) {
          const key = entry.value[0];
          const node = entry.value[1];
          entry = iter.next();
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

        // Prefix/suffix trim: positions whose key, node identity, and reuse class are unchanged
        // skip the diff entirely. Index-fallback keys must also hold the item reference, or a
        // positionally-equal replacement would trim stale content.
        const newLen = newKeys.length;
        const oldLen = currentKeys.length;
        const maxTrim = newLen < oldLen ? newLen : oldLen;
        let prefix = 0;
        while (
          prefix < maxTrim &&
          newKeys[prefix] === currentKeys[prefix] &&
          newKeyToNode.get(newKeys[prefix]) === keyToNode.get(currentKeys[prefix]) &&
          (newExplicit[prefix] === 1 || keyToItem.get(currentKeys[prefix]) === arr[prefix])
        ) {
          prefix++;
        }
        let suffix = 0;
        const maxSuffix = maxTrim - prefix;
        while (
          suffix < maxSuffix &&
          newKeys[newLen - 1 - suffix] === currentKeys[oldLen - 1 - suffix] &&
          newKeyToNode.get(newKeys[newLen - 1 - suffix]) ===
            keyToNode.get(currentKeys[oldLen - 1 - suffix]) &&
          (newExplicit[newLen - 1 - suffix] === 1 ||
            keyToItem.get(currentKeys[oldLen - 1 - suffix]) === arr[newLen - 1 - suffix])
        ) {
          suffix++;
        }

        const midEnd = newLen - suffix;
        if (midEnd > prefix) {
          keyToOldIndex.clear();
          toMove.clear();
          const oldMidEnd = oldLen - suffix;
          let oi = prefix;
          while (oi < oldMidEnd) {
            keyToOldIndex.set(currentKeys[oi], oi);
            oi++;
          }

          const midLen = midEnd - prefix;
          const mapped = new Array(midLen);
          let hasRetained = false;
          let mi = 0;
          while (mi < midLen) {
            toMove.add(mi);
            const key = newKeys[prefix + mi];
            const oldNode = keyToNode.get(key);
            const newNode = newKeyToNode.get(key);
            if (oldNode && oldNode === newNode) {
              mapped[mi] = keyToOldIndex.get(key) ?? -1;
              hasRetained = true;
            } else {
              mapped[mi] = -1;
            }
            mi++;
          }

          // Insertion boundary: first suffix node, else the region anchor. Moves and inserts
          // never touch trimmed positions.
          const boundary = suffix > 0 ? newKeyToNode.get(newKeys[midEnd])! : anchor;
          if (!hasRetained) {
            // Every middle key is fresh — one batched fragment insert before the boundary.
            const fragment = document.createDocumentFragment();
            let fi = prefix;
            while (fi < midEnd) {
              fragment.appendChild(newKeyToNode.get(newKeys[fi])!);
              fi++;
            }
            actualParent.insertBefore(fragment, boundary);
          } else {
            const tails: number[] = [];
            const prevIndices = new Array(midLen).fill(-1);
            let ki = 0;

            while (ki < midLen) {
              if (mapped[ki] === -1) {
                ki++;
                continue;
              }

              let left = 0,
                right = tails.length;

              while (left < right) {
                const mid = Math.floor((left + right) / 2);
                if (mapped[tails[mid]!] < mapped[ki]) {
                  left = mid + 1;
                } else {
                  right = mid;
                }
              }

              left > 0 && (prevIndices[ki] = tails[left - 1]);

              if (left === tails.length) {
                tails.push(ki);
              } else {
                tails[left] = ki;
              }
              ki++;
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
            let li = 0;
            while (li < lisLen) {
              toMove.delete(lis[li]!);
              li++;
            }

            let moveAnchor: Node | null = boundary;
            let wi = midEnd - 1;
            while (wi >= prefix) {
              const node = newKeyToNode.get(newKeys[wi])!;
              toMove.has(wi - prefix) && actualParent.insertBefore(node, moveAnchor);
              moveAnchor = node;
              wi--;
            }
          }
        }

        const tempNode = keyToNode;
        const tempItem = keyToItem;
        const tempKeys = currentKeys;
        const tempExplicit = newExplicit;
        keyToNode = newKeyToNode;
        keyToItem = newKeyToItem;
        currentKeys = newKeys;
        newExplicit = tempExplicit;
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
