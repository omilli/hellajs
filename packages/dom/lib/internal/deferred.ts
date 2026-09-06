import type { HellaElement, RenderFn } from "../types/nodes";
import type { StageSwapResult } from "./hydrate";

/**
 * Adopter for a marker-bounded region — `adoptRegion` from `internal/hydrate.ts`, received via
 * {@link setDeferredAdopters} so this module never imports hydrate.ts values (cycle break).
 */
type AdoptRegionFn = (parent: HellaElement, child: RenderFn, anchor: Node, existing: Node[], stageMissing?: boolean) => void;

/**
 * Stage swapper — `swapSuspenseStage` from `internal/hydrate.ts`, received via
 * {@link setDeferredAdopters} so this module never imports hydrate.ts values (cycle break).
 */
type StageSwapFn = (existing: Node[], anchor: Node) => StageSwapResult;

/** Registered adopter — set once at hydrate.ts module init, before any deferred fn can run. */
let adoptRegionFn!: AdoptRegionFn;

/** Registered stage swapper — set once at hydrate.ts module init, before any deferred fn can run. */
let swapStageFn!: StageSwapFn;

/**
 * @internal
 * Registers the walker-coupled region adopter + suspense-stage swapper from `internal/hydrate.ts`.
 * Breaks the circular import the same way `setMountNode` does: hydrate.ts imports this module's
 * deferred-state accessors, so this module must not import hydrate.ts values back.
 * @param adopt `adoptRegion` — pushes a HydrateCtx and invokes the region's render fn
 * @param swap `swapSuspenseStage` — swaps a fallback for its staged `<template>` children
 */
export function setDeferredAdopters(adopt: AdoptRegionFn, swap: StageSwapFn): void {
  adoptRegionFn = adopt;
  swapStageFn = swap;
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
 * @internal
 * Registers a suspense region whose staged `<template>` hadn't arrived at hydrate time. The fallback
 * stays mounted; adoption is retried by `recheckDeferredRegions` on observed container mutations.
 * @param entry The region to defer — parent, render fn, anchor, close-marker successor, stand-in nodes, sentinel.
 */
export function deferSuspenseRegion(entry: DeferredRegion): void {
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
 * arrived: the registered stage swapper replaces the fallback and the resolved children are adopted
 * (wiring function-ref props, handlers, and effects exactly like the synchronous hydrate path).
 * Arm 2 — the sentinel is detached and the recorded nodes were swapped out externally (an inline
 * `$hs` that ran while the region markers were intact): the nodes now occupying the region's slot
 * (anchor → recorded `next`) are adopted. Each adopted region then replays its buffered events — on
 * the original target while it survived, else on the adopted node at the same top-level index
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
        adopted = swapStageFn(region.nodes, region.anchor).nodes;
        adoptRegionFn(region.parent, region.child, region.anchor, adopted);
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
        adoptRegionFn(region.parent, region.child, region.anchor, adopted);
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
    adoptRegionFn(region.parent, region.child, region.anchor, region.nodes, true);
  }
  deferredRegions.length = 0;
  replayQueue.length = 0;
  stopDeferredRegionWatch();
}

/**
 * @internal
 * Resets the selective-hydration state — discards deferred regions and buffered replay events and
 * tears down the deferred-region watch (container observer, body replay listeners, readystatechange
 * listener). Called by `resetHydrateState`.
 */
export function resetDeferredState(): void {
  deferredRegions.length = 0;
  replayQueue.length = 0;
  stopDeferredRegionWatch();
}
