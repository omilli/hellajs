import type { HellaNode, HellaChild, HellaElement, RenderFn, ElementMountFn } from "../types/nodes";
import { isFunction, objectLoop } from "./core";
import { renderProp, resolveValue, isHellaNode } from "./utils";
import { setNodeHandler, setDirectHandler } from "./events";
import { dispatchError, toError } from "./dispatch";
import { registry } from "../registry";
import { getState } from "./state";
import { mountNode, resolveNode, getBoundaryConfig, clearRenderedNodes } from "./render";

/**
 * @internal
 * Hydration context pushed onto the module stack while the hydrate walker hands
 * existing server DOM to an isDynamic component (ForEach/Transition). The component reads it via
 * {@link peekHydrateContext} and adopts the pre-gathered region nodes (instead of building fresh),
 * reusing the walker's pre-positioned anchor. The stack makes nested regions reentrancy-safe.
 */
export interface HydrateCtx {
  /** Anchor the walker pre-positioned at the region's place in the parent. */
  anchor: Node;
  /** Existing server DOM nodes for this region, gathered from between its `<!--[-->…<!--]-->` markers. */
  existingNodes: Node[];
  /** Recurse adoption into an adopted child element. */
  hydrateNode: (node: HellaNode, existing: Node | null, boundary?: Element) => Node;
}

const hydrateStack: HydrateCtx[] = [];

/**
 * @internal
 * Returns the active hydration context, or undefined when not hydrating.
 */
export function peekHydrateContext(): HydrateCtx | undefined {
  return hydrateStack.length ? hydrateStack[hydrateStack.length - 1] : undefined;
}

function pushHydrateContext(ctx: HydrateCtx): void {
  hydrateStack.push(ctx);
}

function popHydrateContext(): void {
  hydrateStack.pop();
}

/**
 * @internal
 * Resets the hydration stack — clears any contexts left by an interrupted walk.
 */
export function resetHydrateState(): void {
  hydrateStack.length = 0;
}

/** Region-open Comment node discriminator (parser strips `<!--`/`-->`, leaving nodeValue `[`). The close is read inline by `gatherRegion`. */
const isMarkOpen = (n: Node | null): boolean => n !== null && n.nodeType === Node.COMMENT_NODE && n.nodeValue === "[";

/**
 * Gathers the nodes between an open marker and its matching close (depth-aware for nested regions).
 * @internal
 */
function gatherRegion(open: Node): { nodes: Node[]; close: Node } {
  const nodes: Node[] = [];
  let node: Node | null = open.nextSibling;
  let depth = 1;
  while (node) {
    if (node.nodeType === Node.COMMENT_NODE) {
      if (node.nodeValue === "[") {
        depth++;
      } else if (node.nodeValue === "]") {
        depth--;
        if (depth === 0) return { nodes, close: node };
      }
    }
    nodes.push(node);
    node = node.nextSibling;
  }
  return { nodes, close: open };   // no close found — degenerate; treat open as close
}

/**
 * Consumes a marker-bounded region: gathers its nodes, removes the open/close markers, inserts a
 * persistent text anchor where the open marker was. Returns the anchor, the gathered nodes, and the
 * DOM pointer past the region (the node that followed the close marker).
 * @internal
 */
function consumeRegion(parent: HellaElement, open: Node): { anchor: Node; existing: Node[]; next: Node | null } {
  const { nodes: existing, close } = gatherRegion(open);
  const anchor = document.createTextNode("");
  parent.insertBefore(anchor, open);
  parent.removeChild(open);
  if (close !== open) parent.removeChild(close);
  return { anchor, existing, next: close.nextSibling };
}

/**
 * @internal
 * β hydrate-swap for `<Suspense>`: if the gathered region nodes contain a sentinel comment whose nodeValue
 * is a staged `<template>` id, replace the fallback with the template's resolved children (no inline script —
 * the swap runs during this single hydrate pass). Returns the nodes to adopt (swapped children, or the
 * original `existing` when there is no stage — e.g. an `ssr`/`ssrAsync` render where children are present).
 */
function swapSuspenseStage(existing: Node[], anchor: Node): Node[] {
  let template: HTMLTemplateElement | null = null;
  for (const n of existing) {
    if (n.nodeType === Node.COMMENT_NODE && n.nodeValue) {
      const staged = document.getElementById(n.nodeValue);
      if (staged && staged.tagName === "TEMPLATE") { template = staged as HTMLTemplateElement; break; }
    }
  }
  if (!template) return existing;
  const swapped = Array.from(template.content.childNodes);
  const parent = anchor.parentNode;
  for (const n of existing) { if (n.parentNode) n.parentNode.removeChild(n); }   // drop fallback + sentinel
  if (parent) for (const n of swapped) parent.insertBefore(n, anchor);            // place resolved children
  template.remove();
  return swapped;
}

/**
 * Pushes a HydrateCtx seeded with the gathered region nodes + the walker's anchor, calls the
 * isDynamic component fn (which adopts via {@link peekHydrateContext}), then pops.
 * @internal
 */
function adoptRegion(parent: HellaElement, child: RenderFn, anchor: Node, existing: Node[]): void {
  pushHydrateContext({ anchor, existingNodes: existing, hydrateNode });
  child(parent);
  popHydrateContext();
}

/**
 * Sets up a reactive (non-dynamic) child's effect against a marker-bounded region: the server-rendered
 * nodes are ADOPTED as the initial render (first run skipped); subsequent signal changes clear + render
 * fresh (mirroring `appendToParent`, incl. the isDynamic-resolved `Proxy` branch — safe here because
 * `clearRenderedNodes` runs before re-rendering on subsequent runs).
 * @internal
 */
function adoptReactiveRegion(parent: HellaElement, child: HellaChild, anchor: Node, existing: Node[], boundaryElement?: Element): void {
  const renderedNodes: Node[] = existing;
  let firstRun = existing.length > 0;
  registry.addEffect(parent, () => {
    const actualParent = anchor.parentNode;
    if (!actualParent) return;
    try {
      const resolved = resolveValue(child);
      const isDyn = isFunction(resolved) && (resolved as RenderFn).isDynamic;
      if (firstRun && !isDyn) {
        firstRun = false;
        return;                      // adopt text/element nodes; dependency registered via resolveValue
      }
      firstRun = false;
      clearRenderedNodes(renderedNodes, actualParent);
      if (isDyn) {
        const proxyParent = new Proxy(actualParent as Element, {
          get(target, prop) {
            if (prop === "appendChild") {
              return (node: Node) => {
                renderedNodes.push(node);
                return target.insertBefore(node, anchor);
              };
            }
            const val = (target as unknown as Record<string, unknown>)[prop as string];
            return typeof val === "function" ? (val as (...args: unknown[]) => unknown).bind(target) : val;
          }
        });
        (resolved as RenderFn)(proxyParent as HellaElement);
        return;
      }
      const node = resolveNode(resolved as HellaChild, parent);
      if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
        let f: ChildNode | null = node.firstChild;
        while (f) {
          renderedNodes.push(f);
          actualParent.insertBefore(f, anchor);
          f = node.firstChild;
        }
      } else {
        renderedNodes.push(node);
        actualParent.insertBefore(node, anchor);
      }
    } catch (err) {
      const config = getBoundaryConfig(boundaryElement);
      dispatchError(toError(err), { phase: "mount", element: parent, config });
    }
  });
}

/**
 * @internal
 * Replaces a mismatched server node with a freshly mounted subtree in place.
 */
function replaceMismatch(node: HellaNode, existing: Node | null, boundaryElement?: Element): Node {
  const fresh = mountNode(node, boundaryElement);
  if (existing && existing.parentNode) {
    existing.parentNode.replaceChild(fresh, existing);
  }
  return fresh;
}

/**
 * @internal
 * Hydrates a HellaNode into an EXISTING server-rendered element — attaches
 * scope/error/hooks/event handlers/bindings without recreating the element.
 * Mirrors `mountNode`'s step order, diverging at create-vs-use and skipping
 * `props` (the server already applied them via `ssr()`). On tag mismatch, warns
 * and subtree-replaces. Returns the hydrated element, or a fresh subtree on mismatch.
 */
export function hydrateNode(node: HellaNode, existing: Node | null, boundaryElement?: Element): Node {
  if (node.__static && existing && existing.nodeType === Node.ELEMENT_NODE) {
    const staticTag = node.tag as string | undefined;
    if (staticTag && (existing as Element).tagName !== staticTag.toUpperCase()) {
      console.warn(`[dom] hydrate mismatch: expected <${staticTag}>, found <${(existing as Element).tagName.toLowerCase()}>`);
      return replaceMismatch(node, existing, boundaryElement);
    }
    return existing as Node;
  }

  const { tag, on, e, bind, hooks, children, __scope, error } = node;

  if (!existing || existing.nodeType !== Node.ELEMENT_NODE) {
    console.warn("[dom] hydrate mismatch: expected element node");
    return replaceMismatch(node, existing, boundaryElement);
  }

  const element = existing as HellaElement;
  if (tag && element.tagName !== (tag as string).toUpperCase()) {
    console.warn(`[dom] hydrate mismatch: expected <${tag}>, found <${element.tagName.toLowerCase()}>`);
    return replaceMismatch(node, existing, boundaryElement);
  }

  if (__scope) {
    getState(element).componentScope = __scope;
  }
  if (error) {
    const state = getState(element);
    state.errorConfig = error;
    state.originalNode = node;
  }
  const currentBoundary = error ? element : boundaryElement;

  if (hooks) {
    hooks.beforeMount && registry.addHook(element, "beforeMount", hooks.beforeMount);
    hooks.afterMount && registry.addHook(element, "afterMount", hooks.afterMount as ElementMountFn);
    hooks.beforeDestroy && registry.addHook(element, "beforeDestroy", hooks.beforeDestroy as ElementMountFn);
    hooks.afterDestroy && registry.addHook(element, "afterDestroy", hooks.afterDestroy);
    hooks.beforeUpdate && registry.addHook(element, "beforeUpdate", hooks.beforeUpdate as ElementMountFn);
    hooks.afterUpdate && registry.addHook(element, "afterUpdate", hooks.afterUpdate as ElementMountFn);

    if (hooks.beforeMount) {
      try {
        hooks.beforeMount();
      } catch (err) {
        const config = getBoundaryConfig(currentBoundary);
        dispatchError(toError(err), { phase: "mount", element, config });
      }
    }
  }

  // SKIP props — server already applied them via ssr()

  objectLoop(on, (eventName, handler) =>
    setNodeHandler(element, eventName, handler as EventListener)
  );

  if (e) {
    objectLoop(e, (eventName, handler) =>
      setDirectHandler(element, eventName, handler as EventListener)
    );
  }

  objectLoop(bind, (key, value) =>
    registry.addEffect(element, () => {
      try {
        renderProp(element, key, resolveValue(value));
      } catch (err) {
        const config = getBoundaryConfig(currentBoundary);
        const fallback = dispatchError(toError(err), { phase: "update", element, config });
        if (fallback) {
          const target = currentBoundary ?? element;
          target.replaceChildren(mountNode(fallback));
        }
      }
    })
  );

  hydrateSequence(element, children, element.firstChild, currentBoundary);
  return element;
}

/**
 * @internal
 * Walks AST children in parallel with existing server DOM via a node pointer, locating each dynamic
 * region by its `<!--[-->…<!--]-->` Comment markers (emitted by `ssr`). Static text/elements match by
 * position; reactive children + isDynamic components + fragments are marker-bounded and adopted.
 * @param parent The existing element whose children are being hydrated
 * @param children AST children
 * @param current DOM pointer (first unconsumed server node)
 * @param boundaryElement Nearest error boundary
 * @returns The advanced DOM pointer
 */
export function hydrateSequence(parent: HellaElement, children: HellaChild[] | undefined, current: Node | null, boundaryElement?: Element): Node | null {
  if (!children || children.length === 0) return current;
  let i = 0;
  const len = children.length;
  while (i < len) {
    const child = children[i];

    if (isHellaNode(child)) {
      const node = child as HellaNode;
      if (node.tag === "$") {
        // fragment child — bounded by markers; gather, remove both markers, recurse children inline
        if (current && isMarkOpen(current)) {
          const { close } = gatherRegion(current);
          const firstChild = current.nextSibling;
          parent.removeChild(current);
          if (close !== current) parent.removeChild(close);
          current = hydrateSequence(parent, node.children, firstChild, boundaryElement);
        } else {
          console.warn("[dom] hydrate: expected fragment marker, not found");
          current = hydrateSequence(parent, node.children, current, boundaryElement);
        }
      } else {
        const result = hydrateNode(node, current, boundaryElement);
        if (result && !result.parentNode) {
          parent.appendChild(result);
        }
        current = result ? result.nextSibling : null;
      }
      i++;
      continue;
    }

    if (isFunction(child) && (child as RenderFn).isDynamic) {
      current = hydrateDynamic(parent, child as RenderFn, current);
      i++;
      continue;
    }

    if (isFunction(child)) {
      // reactive child — bounded by markers
      if (current && isMarkOpen(current)) {
        const { anchor, existing, next } = consumeRegion(parent, current);
        adoptReactiveRegion(parent, child, anchor, existing, boundaryElement);
        current = next;
      } else {
        console.warn("[dom] hydrate: expected reactive-region marker, not found");
        const anchor = document.createTextNode("");
        if (current) parent.insertBefore(anchor, current); else parent.appendChild(anchor);
        adoptReactiveRegion(parent, child, anchor, [], boundaryElement);
      }
      i++;
      continue;
    }

    // static text / number / primitive — consume the matching server node by position
    current = current ? current.nextSibling : null;
    i++;
  }
  return current;
}

/**
 * Dispatches an isDynamic child against its marker-bounded region: consumes the region, then either
 * adopts the gathered nodes (ForEach/Transition) or drops them and re-runs (Portal/Lazy).
 * @internal
 */
function hydrateDynamic(parent: HellaElement, child: RenderFn, current: Node | null): Node | null {
  if (!current || !isMarkOpen(current)) {
    console.warn("[dom] hydrate: expected isDynamic-region marker, not found");
    const anchor = document.createTextNode("");
    if (current) parent.insertBefore(anchor, current); else parent.appendChild(anchor);
    adoptRegion(parent, child, anchor, []);
    return current;
  }
  const { anchor, existing, next } = consumeRegion(parent, current);
  const meta = child.ssr;
  switch (meta?.kind) {
    case "forEach":
    case "transition":
      adoptRegion(parent, child, anchor, existing);
      break;
    case "portal":
      adoptRegion(parent, child, anchor, []);   // server rendered nothing in-place
      break;
    case "lazy":
      clearRenderedNodes(existing, parent);     // drop the server loading node; re-run the loader
      adoptRegion(parent, child, anchor, []);
      break;
    case "suspense":
      adoptRegion(parent, child, anchor, swapSuspenseStage(existing, anchor));   // β hydrate-swap: stage → resolved children
      break;
    default:
      adoptRegion(parent, child, anchor, existing);
  }
  return next;
}
