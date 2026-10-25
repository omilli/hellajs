import type { HellaElement, HellaChild, RenderFn } from "../types/nodes";
import { isFunction, isObject, isNull } from "./core";
import { resolveDeep, isTemplateBuild, toText } from "./utils";
import { dispatchError, findBoundary, toError } from "./dispatch";
import { registry } from "../registry";
import { deferSuspenseRegion, resetDeferredState, setDeferredAdopters } from "./deferred";
import {
  resolveNode,
  getBoundaryConfig,
  clearRenderedNodes,
  childNamespaceOf,
  HTML_NS,
} from "./render";
import { drainAnchorCleanup } from "./cleanup";
import { claims } from "./adoption";

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
  /** True when a `<!--hsN-->` stage sentinel was gathered but its staged `<template>` never arrived (interrupted stream) — `<Suspense>` re-suspends client-side. */
  stageMissing?: boolean;
  /** The node that followed the region's close marker at consume time — a claiming body's frame bound (ownership ends at the region's edge). */
  claimBound?: Node | null;
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
  resetDeferredState();
}

/**
 * Region-open Comment node discriminator (parser strips `<!--`/`-->`, leaving nodeValue `[`). The close is read inline by `gatherRegion`.
 * @internal Exported for `lib/runtime.ts`'s adoption context, whose claim cursors probe the same markers.
 */
export function isMarkOpen(n: Node | null): boolean {
  return !isNull(n) && n.nodeType === Node.COMMENT_NODE && n.nodeValue === "[";
}

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
  return { nodes, close: open }; // no close found — degenerate; treat open as close
}

/**
 * Consumes a marker-bounded region: gathers its nodes, removes the open/close markers, inserts a
 * persistent text anchor where the open marker was. Returns the anchor, the gathered nodes, and the
 * DOM pointer past the region (the node that followed the close marker).
 * @internal Exported for `lib/runtime.ts`'s adoption context — the compiled child/text arms consume the
 * region their wiring call owns through this same reader (no parallel implementation).
 */
export function consumeRegion(
  parent: HellaElement,
  open: Node,
): { anchor: Node; existing: Node[]; next: Node | null } {
  const { nodes: existing, close } = gatherRegion(open);
  const next = close.nextSibling; // capture before removeChild — a detached node's nextSibling is null
  const anchor = document.createTextNode("");
  parent.insertBefore(anchor, open);
  parent.removeChild(open);
  if (close !== open) parent.removeChild(close);
  return { anchor, existing, next };
}

/** Matches a `<Suspense>` stage-sentinel comment id (`hs0`, `hs1`, …) emitted by `@hellajs/ssr`'s stream. */
const HS_STAGE_REGEX = /^hs\d+$/;

/**
 * @internal
 * Result of {@link swapSuspenseStage}; named so `internal/deferred.ts` can type its registered swapper.
 */
export interface StageSwapResult {
  nodes: Node[];
  missing: boolean;
  sentinel: Comment | null;
}

/**
 * @internal
 * No-script/HappyDOM fallback swap for `<Suspense>`: if the gathered region nodes contain a sentinel comment whose nodeValue
 * is a staged `<template>` id, replace the fallback with the template's resolved children. In a browser an inline `$hs`
 * script (emitted by `@hellajs/ssr`) has already swapped each region on arrival; this runs only when that script hasn't
 * (e.g. in HappyDOM tests). Returns the nodes to adopt (swapped children, or the
 * original `existing` when there is no stage — e.g. an `ssr`/`ssr.async` render where children are present), plus
 * `missing: true` when a stage sentinel was seen but its template is gone (interrupted stream) — the caller
 * re-suspends — and the sentinel comment itself (identity captured for the deferred-region registry).
 */
export function swapSuspenseStage(existing: Node[], anchor: Node): StageSwapResult {
  let template: HTMLTemplateElement | null = null;
  let sentinel: Comment | null = null;
  let si = 0;
  const sLen = existing.length;
  while (si < sLen) {
    const n = existing[si++]!;
    if (n.nodeType === Node.COMMENT_NODE && n.nodeValue) {
      if (HS_STAGE_REGEX.test(n.nodeValue)) sentinel = n as Comment;
      const staged = document.getElementById(n.nodeValue);
      if (staged && staged.tagName === "TEMPLATE") {
        template = staged as HTMLTemplateElement;
        break;
      }
    }
  }
  if (!template) return { nodes: existing, missing: !isNull(sentinel), sentinel };
  const swapped = Array.from(template.content.childNodes);
  const parent = anchor.parentNode;
  let ri = 0;
  const rLen = existing.length;
  while (ri < rLen) {
    const n = existing[ri++]!;
    if (n.parentNode) n.parentNode.removeChild(n); // drop fallback + sentinel
  }
  if (parent) {
    let pi = 0;
    const pLen = swapped.length;
    while (pi < pLen) {
      parent.insertBefore(swapped[pi++]!, anchor); // place resolved children
    }
  }
  template.remove();
  return { nodes: swapped, missing: false, sentinel };
}

/**
 * @internal
 * Pushes a HydrateCtx seeded with the gathered region nodes + the walker's anchor, calls the
 * isDynamic component fn (which adopts via {@link peekHydrateContext}), then pops. The body owns
 * its own claiming: Suspense frames at the stage head under `claimBound`; the bare-adopt bodies
 * (ForEach/Transition/Lazy) pair nodes positionally without claims, and their degrade paths run
 * `constructFresh` (mount semantics under an active root frame). Exported for
 * `internal/deferred.ts`, whose deferred arms adopt arrived/late regions through the registered
 * adopter — the region coupling (the ctx stack) lives here.
 */
export function adoptRegion(
  parent: HellaElement,
  child: RenderFn,
  anchor: Node,
  existing: Node[],
  stageMissing = false,
  next: Node | null = null,
): void {
  // `claimBound` carries the region's close-marker successor so a meta body that claims under its
  // own nested frame (Suspense) stops its leftover scan at the region's edge instead of the
  // parent's following sibling sites.
  pushHydrateContext({ anchor, existingNodes: existing, stageMissing, claimBound: next });
  child(parent);
  popHydrateContext();
}

// Registration breaks the circular import: deferred.ts needs these region-coupled fns, hydrate.ts needs its state accessors (the injection pattern)
setDeferredAdopters(adoptRegion, swapSuspenseStage);

/**
 * Sets up a reactive (non-dynamic) child's effect against a marker-bounded region: the server-rendered
 * nodes are ADOPTED as the initial render (first run skipped); subsequent signal changes clear + render
 * fresh, incl. the isDynamic-resolved `Proxy` branch — safe here because
 * `clearRenderedNodes` runs before re-rendering on subsequent runs. Each re-run first drains any
 * component state left on the persistent region anchor (`drainAnchorCleanup` — a no-op for the common
 * text/element case), so a dynamic component's effect and disposers never outlive their run.
 * @internal Exported for the runtime's adoption machinery — the compiled text/child arms drive it.
 */
export function adoptReactiveRegion(
  parent: HellaElement,
  child: unknown,
  anchor: Node,
  existing: Node[],
  boundaryElement?: Element,
): void {
  const renderedNodes: Node[] = existing;
  let firstRun = existing.length > 0;
  registry.addEffect(parent, () => {
    drainAnchorCleanup(anchor);
    const actualParent = anchor.parentNode;
    if (!actualParent) return;
    try {
      const deep = resolveDeep(child);
      // A getter may return an array of getters (the compiled single-child wrap of a
      // component slot). Drill them inside the effect so their signal reads track — a
      // stalled element would leave the region with no dependency, inert on every run.
      // The mount-side resolveNode array branch instead builds a per-element sub-region
      // (what keeps text-region node identity there); only the hydrate adopt drills.
      let resolved = deep;
      if (Array.isArray(deep)) {
        let di = 0;
        let drills = false;
        const dLen = deep.length;
        while (di < dLen) {
          const el: unknown = deep[di++];
          if (isFunction(el) && !(el as RenderFn).isDynamic) {
            drills = true;
            break;
          }
        }
        if (drills) {
          const drilled = deep.slice();
          di = 0;
          while (di < dLen) {
            const el: unknown = drilled[di];
            if (isFunction(el) && !(el as RenderFn).isDynamic) drilled[di] = resolveDeep(el);
            di++;
          }
          resolved = drilled;
        }
      }
      const isDyn = isFunction(resolved) && (resolved as RenderFn).isDynamic;
      if (firstRun && !isDyn) {
        firstRun = false;
        // Flagged-build resolutions claim+wire the gathered server nodes in place — the
        // build's construction calls attach handlers/effects to the adopted DOM, and claims
        // preserve identity, so `renderedNodes` (== `existing`) still tracks the region for
        // later re-runs' clear. Claimed nodes are already positioned — no insertion. For an
        // array resolution each build element claims positionally (construction order =
        // document order); non-build elements keep their server-rendered output. Primitives
        // keep the bare adopt: the server already rendered them and this effect tracks the
        // getter for re-runs. resolveDeep already registered the closure's own dependencies.
        const last = existing[existing.length - 1]!;
        if (isTemplateBuild(resolved)) {
          claims!.adoptClaimFrame(
            actualParent as Element,
            existing[0] ?? null,
            () => resolveNode(resolved as HellaChild, parent, childNamespaceOf(parent)),
            last.nextSibling,
          );
          return;
        }
        if (Array.isArray(resolved) && resolved.some((el) => isTemplateBuild(el))) {
          claims!.adoptClaimFrame(
            actualParent as Element,
            existing[0] ?? null,
            () => {
              let bi = 0;
              const bLen = resolved.length;
              while (bi < bLen) {
                const el: unknown = resolved[bi++];
                if (isTemplateBuild(el)) {
                  resolveNode(el as HellaChild, parent, childNamespaceOf(parent));
                }
              }
            },
            last.nextSibling,
          );
          return;
        }
        return;
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
          },
        });
        (resolved as RenderFn)(proxyParent as HellaElement);
        return;
      }
      // Primitives settle INTO the anchor, mirroring runReactiveChild's tail: a transient text
      // node ahead of the anchor would become the region's first node, and hydrate's fragment
      // scope rides exactly that node (regionPrev.nextSibling) — the next re-run's clear would
      // dispose the chained component scope one region flip early (killing the component's
      // effects while it stays mounted). Only arrays and template-build/raw objects mount fresh nodes.
      if (
        Array.isArray(resolved) ||
        isTemplateBuild(resolved) ||
        (isObject(resolved) && "raw" in resolved)
      ) {
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
        return;
      }
      anchor.textContent = toText(resolved);
    } catch (err) {
      // Run-time boundary resolution (mirrors the mount path): the nearest boundary of
      // the region's parent, falling back to the caller's threaded one.
      const boundary = boundaryElement ?? findBoundary(parent) ?? undefined;
      const config = getBoundaryConfig(boundary);
      dispatchError(toError(err), { phase: "mount", element: parent, config });
    }
  });
}

/**
 * Tag equality against an existing server node: HTML parsers uppercase `tagName`, while elements
 * in a foreign namespace (SVG, MathML) keep the authored case — compare exact-case there.
 * @internal Exported for `lib/runtime.ts`'s claim arms, which verify claimed server nodes against the
 * compiled template's root tag (structural parity guard at the claim site).
 */
export function tagMatches(element: Element, tag: string): boolean {
  const ns = element.namespaceURI;
  return element.tagName === (ns && ns !== HTML_NS ? tag : tag.toUpperCase());
}

/**
 * Runs the isDynamic adoption dispatch over an already-consumed region — `lib/runtime.ts`'s compiled
 * child arm drives it for marker-bounded flagged build fns: the same `ssr` meta kinds through one
 * dispatcher, no parallel switch. ForEach/Transition adopt the gathered nodes; Portal passes `[]`
 * (server rendered nothing in-place) and re-mounts into the target; Lazy adopts the gathered nodes
 * too — server content (a loaded render from `ssr.async`/`ssr.stream`, or a sync render's loading
 * UI) stays until the loader's fresh run swaps it (`Lazy.ts` skips the loading insert when the
 * region holds server nodes and `clearRenderedNodes`s the server nodes on settle — no flash).
 * Suspense runs `swapSuspenseStage` — the no-script/HappyDOM fallback (a staged `<template>` whose
 * id matches a sentinel comment replaces the fallback; the swap also returns the sentinel comment
 * itself). In a browser the inline `$hs` swap script (emitted by `@hellajs/ssr`) has already
 * swapped each region as it arrived, so this runs only when that script hasn't (e.g. in tests).
 * Either way it then adopts the resolved children. When the sentinel is present but its staged
 * `<template>` never arrived (interrupted stream), the ctx is flagged `stageMissing` and
 * `<Suspense>` degrades to fresh-mount semantics — fallback kept, child re-suspended client-side,
 * content swapped on settle, rejections bubbled — EXCEPT while `document.readyState === "loading"`
 * (hydrate executing mid-parse), where the region is instead registered in `deferredRegions`
 * (`deferSuspenseRegion`, `internal/deferred.ts`) — see §hydrate in dom's AGENTS.md for the
 * selective-hydration watch. `next` is the DOM pointer past the consumed region (the node that
 * followed its close marker), forwarded to the deferral registry verbatim.
 * @internal Exported for the runtime's compiled child arm (the shared isDynamic dispatch).
 */
export function adoptDynamicRegion(
  parent: HellaElement,
  child: RenderFn,
  anchor: Node,
  existing: Node[],
  next: Node | null,
): void {
  const meta = child.ssr;
  let swappedStage: { nodes: Node[]; missing: boolean; sentinel: Comment | null };
  switch (meta?.kind) {
    case "forEach":
    case "transition":
      adoptRegion(parent, child, anchor, existing, false, next);
      break;
    case "portal":
      adoptRegion(parent, child, anchor, [], false, next); // server rendered nothing in-place
      break;
    case "lazy":
      adoptRegion(parent, child, anchor, existing, false, next); // server content (loaded render, or loading UI from a sync render) stays until Lazy's fresh loader run replaces it — no flash
      break;
    case "suspense":
      // no-script fallback: staged <template> → resolved children (a browser's inline $hs already swapped on arrival);
      // sentinel-without-template while the parser is still streaming (readyState "loading" — hydrate executing
      // mid-parse) → defer adoption until the stage arrives (selective hydration); once parsing is done the
      // template is present or provably dead, so degrade via stageMissing (re-suspend client-side)
      swappedStage = swapSuspenseStage(existing, anchor);
      if (swappedStage.sentinel && swappedStage.missing && document.readyState === "loading") {
        deferSuspenseRegion({
          parent,
          child,
          anchor,
          next,
          nodes: existing,
          sentinel: swappedStage.sentinel,
        });
        break;
      }
      adoptRegion(parent, child, anchor, swappedStage.nodes, swappedStage.missing, next);
      break;
    default:
      adoptRegion(parent, child, anchor, existing, false, next);
  }
}
