import type { HellaNode, HellaChild, HellaElement, RenderFn, ElementMountFn, DirectListenerSpec } from "../types/nodes";
import { isFunction, isObject, isNull, objectLoop } from "./core";
import { renderProp, resolveValue, isHellaNode } from "./utils";
import { setNodeHandler, setDirectHandler } from "./events";
import { dispatchError, toError } from "./dispatch";
import { registry } from "../registry";
import { getState } from "./state";
import { mountNode, resolveNode, getBoundaryConfig, clearRenderedNodes, childNamespaceOf, HTML_NS } from "./render";

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
  /** True when a `<!--hsN-->` stage sentinel was gathered but its staged `<template>` never arrived (interrupted stream) — `<Suspense>` re-suspends client-side. */
  stageMissing?: boolean;
}

const hydrateStack: HydrateCtx[] = [];

/**
 * @internal
 * Returns the active hydration context, or undefined when not hydrating.
 */
export function peekHydrateContext(): HydrateCtx | undefined {
  return hydrateStack.length ? hydrateStack[hydrateStack.length - 1] : undefined;
}

/** Pushes a hydration context so the next `fn(parent)` call adopts via `peekHydrateContext` — called by `adoptRegion`. */
function pushHydrateContext(ctx: HydrateCtx): void {
  hydrateStack.push(ctx);
}

/** Pops the innermost hydration context off the stack — paired with `pushHydrateContext` in `adoptRegion`. */
function popHydrateContext(): void {
  hydrateStack.pop();
}

/**
 * @internal
 * Resets the hydration stack and the selective-hydration state — clears contexts left by an
 * interrupted walk, discards deferred regions and buffered replay events, and tears down the
 * deferred-region watch (container observer, body replay listeners, readystatechange listener).
 */
export function resetHydrateState(): void {
  hydrateStack.length = 0;
  deferredRegions.length = 0;
  replayQueue.length = 0;
  stopDeferredRegionWatch();
}

/** Region-open Comment node discriminator (parser strips `<!--`/`-->`, leaving nodeValue `[`). The close is read inline by `gatherRegion`. */
const isMarkOpen = (n: Node | null): boolean => !isNull(n) && n.nodeType === Node.COMMENT_NODE && n.nodeValue === "[";

/**
 * Gathers the nodes between an open marker and its matching close (depth-aware for nested regions).
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
 */
function consumeRegion(parent: HellaElement, open: Node): { anchor: Node; existing: Node[]; next: Node | null } {
  const { nodes: existing, close } = gatherRegion(open);
  const next = close.nextSibling;   // capture before removeChild — a detached node's nextSibling is null
  const anchor = document.createTextNode("");
  parent.insertBefore(anchor, open);
  parent.removeChild(open);
  if (close !== open) parent.removeChild(close);
  return { anchor, existing, next };
}

/** Matches a `<Suspense>` stage-sentinel comment id (`hs0`, `hs1`, …) emitted by `@hellajs/ssr`'s stream. */
const HS_STAGE_REGEX = /^hs\d+$/;

/**
 * No-script/HappyDOM fallback swap for `<Suspense>`: if the gathered region nodes contain a sentinel comment whose nodeValue
 * is a staged `<template>` id, replace the fallback with the template's resolved children. In a browser an inline `$hs`
 * script (emitted by `@hellajs/ssr`) has already swapped each region on arrival; this runs only when that script hasn't
 * (e.g. in HappyDOM tests). Returns the nodes to adopt (swapped children, or the
 * original `existing` when there is no stage — e.g. an `ssr`/`ssr.async` render where children are present), plus
 * `missing: true` when a stage sentinel was seen but its template is gone (interrupted stream) — the caller
 * re-suspends — and the sentinel comment itself (identity captured for the deferred-region registry).
 */
function swapSuspenseStage(existing: Node[], anchor: Node): { nodes: Node[]; missing: boolean; sentinel: Comment | null } {
  let template: HTMLTemplateElement | null = null;
  let sentinel: Comment | null = null;
  let si = 0;
  const sLen = existing.length;
  while (si < sLen) {
    const n = existing[si++]!;
    if (n.nodeType === Node.COMMENT_NODE && n.nodeValue) {
      if (HS_STAGE_REGEX.test(n.nodeValue)) sentinel = n as Comment;
      const staged = document.getElementById(n.nodeValue);
      if (staged && staged.tagName === "TEMPLATE") { template = staged as HTMLTemplateElement; break; }
    }
  }
  if (!template) return { nodes: existing, missing: !isNull(sentinel), sentinel };
  const swapped = Array.from(template.content.childNodes);
  const parent = anchor.parentNode;
  let ri = 0;
  const rLen = existing.length;
  while (ri < rLen) {
    const n = existing[ri++]!;
    if (n.parentNode) n.parentNode.removeChild(n);   // drop fallback + sentinel
  }
  if (parent) {
    let pi = 0;
    const pLen = swapped.length;
    while (pi < pLen) {
      parent.insertBefore(swapped[pi++]!, anchor);   // place resolved children
    }
  }
  template.remove();
  return { nodes: swapped, missing: false, sentinel };
}

/**
 * Pushes a HydrateCtx seeded with the gathered region nodes + the walker's anchor, calls the
 * isDynamic component fn (which adopts via {@link peekHydrateContext}), then pops.
 */
function adoptRegion(parent: HellaElement, child: RenderFn, anchor: Node, existing: Node[], stageMissing = false): void {
  pushHydrateContext({ anchor, existingNodes: existing, hydrateNode, stageMissing });
  child(parent);
  popHydrateContext();
}

/**
 * A `<Suspense>` region deferred at hydrate time: the sentinel was present but its staged
 * `<template>` hadn't arrived (document still streaming). The recorded nodes stay mounted as the
 * region's on-screen stand-in — and serve as its replay node set — until adoption is retried.
 */
interface DeferredRegion {
  /** Parent element the walker consumed the region under. */
  parent: HellaElement;
  /** The `<Suspense>` render fn — re-invoked under a hydrate ctx at adoption. */
  child: RenderFn;
  /** The text anchor `consumeRegion` left where the region's open marker was. */
  anchor: Node;
  /** The DOM node that followed the region's close marker at hydrate time — the gather bound for an externally swapped region. */
  next: Node | null;
  /** The gathered fallback + sentinel nodes — the region's stand-in until adoption. */
  nodes: Node[];
  /** The stage-sentinel comment, captured at defer time — its detachment signals an external swap. */
  sentinel: Comment;
}

/** Discrete event types buffered for replay against pending regions (React's selective-hydration replay set). */
const REPLAY_EVENT_TYPES = new Set(["click", "mousedown", "mouseup", "keydown", "change"]);

/** Pending deferred regions — emptied as each adopts, drained on stream death, cleared on reset. */
const deferredRegions: DeferredRegion[] = [];

/** Events captured against pending regions, awaiting their region's adoption: `{ type, target, region }`. */
const replayQueue: { type: string; target: Node; region: DeferredRegion }[] = [];

/** The container observer watching for stage arrivals — `null` while nothing is deferred. */
let regionObserver: MutationObserver | null = null;

/** The body capture-phase listener buffering discrete events — `null` while nothing is deferred. */
let replayListener: ((event: Event) => void) | null = null;

/** True while replay re-dispatches buffered events — stops the capture listener from re-buffering them. */
let isReplaying = false;

/**
 * Registers a suspense region whose staged `<template>` hadn't arrived at hydrate time. The fallback
 * stays mounted; adoption is retried by `recheckDeferredRegions` on observed container mutations.
 */
function deferSuspenseRegion(entry: DeferredRegion): void {
  deferredRegions.push(entry);
}

/**
 * @internal
 * True when at least one region is deferred — `hydrate`'s attach wires the watch only then.
 */
export function hasDeferredRegions(): boolean {
  return deferredRegions.length > 0;
}

/**
 * @internal
 * Starts the deferred-region watch: a MutationObserver on `container` (childList + subtree — stage
 * arrivals and external swaps re-check), a raw `document.body` capture-phase listener per replay event
 * type, and a `readystatechange` listener that drains to degrade once the document is complete (dead
 * stream). One observer watches every deferred container; the watch tears down when no region remains.
 * @param container The hydrate container whose mutations may carry awaited stages.
 */
export function startDeferredRegionWatch(container: Element): void {
  if (!regionObserver) {
    regionObserver = new MutationObserver(recheckDeferredRegions);
    const listener = bufferReplayEvent;
    replayListener = listener;
    REPLAY_EVENT_TYPES.forEach((type) => document.body.addEventListener(type, listener, true));
    document.addEventListener("readystatechange", drainWhenComplete);
  }
  regionObserver.observe(container, { childList: true, subtree: true });
}

/** Tears the deferred-region watch down — disconnects the observer and removes every listener. */
function stopDeferredRegionWatch(): void {
  if (regionObserver) {
    regionObserver.disconnect();
    regionObserver = null;
  }
  if (replayListener) {
    const listener = replayListener;
    REPLAY_EVENT_TYPES.forEach((type) => document.body.removeEventListener(type, listener, true));
    replayListener = null;
  }
  document.removeEventListener("readystatechange", drainWhenComplete);
}

/** `readystatechange` listener — a complete document means the stream is dead: degrade what never arrived. */
function drainWhenComplete(): void {
  if (document.readyState === "complete") drainDeferredRegions();
}

/** Captures a discrete event whose propagation path crosses a pending region — replayed on that region's adoption. */
function bufferReplayEvent(event: Event): void {
  if (isReplaying || deferredRegions.length === 0) return;
  if (!REPLAY_EVENT_TYPES.has(event.type)) return;
  const target = event.target;
  if (!(target instanceof Node)) return;   // platform-invoked listener — untrusted target
  const path = event.composedPath();
  let ri = 0;
  const rLen = deferredRegions.length;
  while (ri < rLen) {
    const region = deferredRegions[ri++]!;
    let ni = 0;
    const nLen = region.nodes.length;
    while (ni < nLen) {
      if (path.includes(region.nodes[ni++]!)) {
        replayQueue.push({ type: event.type, target, region });
        return;
      }
    }
  }
}

/**
 * Re-checks every deferred region against the current DOM — the MutationObserver callback of the
 * deferred-region watch. Arm 1 — a region's sentinel is connected and its staged `<template>` has
 * arrived: `swapSuspenseStage` replaces the fallback and the resolved children are adopted (wiring
 * function-ref props, handlers, and effects exactly like the synchronous hydrate path). Arm 2 —
 * the sentinel is detached and the recorded nodes were swapped out externally (an inline `$hs` that
 * ran while the region markers were intact): the nodes now occupying the region's slot (anchor →
 * recorded `next`) are adopted. Each adopted region then replays its buffered events — on the
 * original target while it survived, else on the adopted node at the same top-level index
 * (positional replay — a detached target cannot reach the delegated body listener where the handler
 * lives; no coordinate fidelity; entries with no connected counterpart are dropped) — and the watch
 * tears down when the last region adopts.
 */
function recheckDeferredRegions(): void {
  let ri = 0;
  while (ri < deferredRegions.length) {
    const region = deferredRegions[ri]!;
    let adopted: Node[] | null = null;
    if (region.sentinel.isConnected) {
      const staged = document.getElementById(region.sentinel.nodeValue!);
      if (staged && staged.tagName === "TEMPLATE") {   // arm 1 — stage arrived
        adopted = swapSuspenseStage(region.nodes, region.anchor).nodes;
        adoptRegion(region.parent, region.child, region.anchor, adopted);
      }
    } else {
      // sentinel detached — external swap, unless the region is simply partial (recorded nodes still live)
      let live = false;
      let ci = 0;
      const cLen = region.nodes.length;
      while (ci < cLen) {
        if (region.nodes[ci++]!.isConnected) {
          live = true;
          break;
        }
      }
      if (!live) {   // arm 2 — adopt whatever now occupies the region's slot
        adopted = [];
        let node = region.anchor.nextSibling;
        while (node && node !== region.next) {
          adopted.push(node);
          node = node.nextSibling;
        }
        adoptRegion(region.parent, region.child, region.anchor, adopted);
      }
    }
    if (adopted) {
      deferredRegions.splice(ri, 1);
      // replay the region's buffered events: on the original target while it survived, else on the
      // adopted node at the same top-level index (positional — a detached target cannot reach the
      // delegated body listener where the handler lives; no connected counterpart → dropped)
      let qi = 0;
      while (qi < replayQueue.length) {
        const entry = replayQueue[qi]!;
        if (entry.region !== region) {
          qi++;
          continue;
        }
        replayQueue.splice(qi, 1);
        let live: Node | null = entry.target;
        if (!live.isConnected) {
          let root: Node | null = live;
          while (root && root.parentNode) root = root.parentNode;   // detached subtree root
          const counterpart = adopted[region.nodes.indexOf(root)];
          live = counterpart && counterpart.isConnected ? counterpart : null;
        }
        if (!live) continue;
        isReplaying = true;
        try {
          live.dispatchEvent(new Event(entry.type, { bubbles: true, cancelable: true, composed: true }));
        } finally {
          isReplaying = false;
        }
      }
    } else {
      ri++;
    }
  }
  if (deferredRegions.length === 0) stopDeferredRegionWatch();
}

/**
 * Degrades every remaining deferred region via the `stageMissing` path — the document completed
 * without the stages arriving (dead stream), so each `<Suspense>` re-suspends client-side with
 * fresh-mount semantics. Buffered events are discarded: degrade wires no handlers at drain time.
 */
function drainDeferredRegions(): void {
  let ri = 0;
  const rLen = deferredRegions.length;
  while (ri < rLen) {
    const region = deferredRegions[ri++]!;
    adoptRegion(region.parent, region.child, region.anchor, region.nodes, true);
  }
  deferredRegions.length = 0;
  replayQueue.length = 0;
  stopDeferredRegionWatch();
}

/**
 * Sets up a reactive (non-dynamic) child's effect against a marker-bounded region: the server-rendered
 * nodes are ADOPTED as the initial render (first run skipped); subsequent signal changes clear + render
 * fresh (mirroring `appendToParent`, incl. the isDynamic-resolved `Proxy` branch — safe here because
 * `clearRenderedNodes` runs before re-rendering on subsequent runs).
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
            return isFunction(val) ? (val as (...args: unknown[]) => unknown).bind(target) : val;
          }
        });
        (resolved as RenderFn)(proxyParent as HellaElement);
        return;
      }
      const node = resolveNode(resolved as HellaChild, parent, childNamespaceOf(parent));
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
 * Tag equality against an existing server node: HTML parsers uppercase `tagName`, while elements
 * in a foreign namespace (SVG, MathML) keep the authored case — compare exact-case there.
 */
function tagMatches(element: Element, tag: string): boolean {
  const ns = element.namespaceURI;
  return element.tagName === (ns && ns !== HTML_NS ? tag : tag.toUpperCase());
}

/**
 * Replaces a mismatched server node with a freshly mounted subtree in place.
 */
function replaceMismatch(node: HellaNode, existing: Node | null, boundaryElement?: Element): Node {
  const fresh = mountNode(node, boundaryElement, childNamespaceOf(existing));
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
  if (node.static && existing && existing.nodeType === Node.ELEMENT_NODE) {
    const staticTag = node.tag as string | undefined;
    if (staticTag && !tagMatches(existing as Element, staticTag)) {
      console.warn(`[dom] hydrate mismatch: expected <${staticTag}>, found <${(existing as Element).tagName.toLowerCase()}>`);
      return replaceMismatch(node, existing, boundaryElement);
    }
    return existing as Node;
  }

  const { tag, props, on, e, hooks, children, componentScope, error } = node;

  if (!existing || existing.nodeType !== Node.ELEMENT_NODE) {
    console.warn("[dom] hydrate mismatch: expected element node");
    return replaceMismatch(node, existing, boundaryElement);
  }

  const element = existing as HellaElement;
  if (tag && !tagMatches(element, tag as string)) {
    console.warn(`[dom] hydrate mismatch: expected <${tag}>, found <${element.tagName.toLowerCase()}>`);
    return replaceMismatch(node, existing, boundaryElement);
  }

  if (componentScope) {
    getState(element).componentScope = componentScope;
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

  // Static props already applied by ssr(); wire only function-ref props as effects
  objectLoop(props, (key, value) => {
    if (!isFunction(value)) return;
    registry.addEffect(element, () => {
      try {
        renderProp(element, key, value());
      } catch (err) {
        const config = getBoundaryConfig(currentBoundary);
        const fallback = dispatchError(toError(err), { phase: "update", element, config });
        if (fallback) {
          const target = currentBoundary ?? element;
          target.replaceChildren(mountNode(fallback));
        }
      }
    });
  });

  objectLoop(on, (eventName, handler) =>
    setNodeHandler(element, eventName, handler as EventListener)
  );

  if (e) {
    objectLoop(e, (eventName, handler) =>
      setDirectHandler(element, eventName, handler as EventListener | DirectListenerSpec)
    );
  }

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

    if (isObject(child) && "raw" in child) {
      if (current && isMarkOpen(current)) {
        current = consumeRegion(parent, current).next;
      } else {
        console.warn("[dom] hydrate: expected raw-region marker, not found");
        const tpl = document.createElement("template");
        tpl.innerHTML = child.raw;
        parent.insertBefore(tpl.content, current);
      }
      i++;
      continue;
    }

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
 * adopts the gathered nodes (ForEach/Transition; Lazy keeps them until its loader re-run replaces
 * them) or drops them and re-runs (Portal).
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
  let swappedStage: { nodes: Node[]; missing: boolean; sentinel: Comment | null };
  switch (meta?.kind) {
    case "forEach":
    case "transition":
      adoptRegion(parent, child, anchor, existing);
      break;
    case "portal":
      adoptRegion(parent, child, anchor, []);   // server rendered nothing in-place
      break;
    case "lazy":
      adoptRegion(parent, child, anchor, existing);   // server content (loaded render, or loading UI from a sync render) stays until Lazy's fresh loader run replaces it — no flash
      break;
    case "suspense":
      // no-script fallback: staged <template> → resolved children (a browser's inline $hs already swapped on arrival);
      // sentinel-without-template while the parser is still streaming (readyState "loading" — hydrate executing
      // mid-parse) → defer adoption until the stage arrives (selective hydration); once parsing is done the
      // template is present or provably dead, so degrade via stageMissing (re-suspend client-side)
      swappedStage = swapSuspenseStage(existing, anchor);
      if (swappedStage.sentinel && swappedStage.missing && document.readyState === "loading") {
        deferSuspenseRegion({ parent, child, anchor, next, nodes: existing, sentinel: swappedStage.sentinel });
        break;
      }
      adoptRegion(parent, child, anchor, swappedStage.nodes, swappedStage.missing);
      break;
    default:
      adoptRegion(parent, child, anchor, existing);
  }
  return next;
}
