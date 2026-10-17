import { hasDocument } from "./core";
import { cleanupSubtree, traverseDescendants, runHooks, setCleanedRootMarker } from "./cleanup";
import { peekState, hasState, registerOverlay } from "./state";

// Wiring breaks the import cycle: cleanup.ts marks cleaned roots after each sync clean, but
// the mark state lives here with the observer (queue.ts imports cleanupSubtree from
// cleanup.ts, so cleanup.ts cannot import this module) — mirrors setMountNode in mount.ts.
setCleanedRootMarker(markCleanedRoot);

/**
 * @internal
 * Queue of nodes pending cleanup processing.
 */
export const cleanupQueue = new Set<Node>();

/**
 * @internal
 * Queue of nodes pending mount processing.
 */
export const mountQueue = new Set<Node>();

let isCleaning = false;
let isMounting = false;
let isCleanupScheduled = false;
let isMountScheduled = false;

/** True once any lifecycle hook has been registered — gates the afterMount walk. */
let mountHooksExist = false;

/** Depth of mount()/hydrate() attaches currently running. */
let activeMounts = 0;

let observedContainers = new WeakSet<Element | ShadowRoot>();
let containerObserver: MutationObserver | null = null;

let cleanedRoots = new WeakSet<Node>();
let cleanedMarksExist = false;

/**
 * @internal
 * Flags that at least one lifecycle hook exists — `processMountQueue` skips the
 * afterMount tree walk entirely while none has ever been registered.
 */
export function noteMountHook(): void {
  mountHooksExist = true;
}

/**
 * @internal
 * Enters a mount()/hydrate() attach — suppresses registration-time `isConnected`
 * checks (post-mount hook firing) while the tree is still building.
 */
export function beginMountPhase(): void {
  activeMounts++;
}

/**
 * @internal
 * Exits a mount()/hydrate() attach.
 */
export function endMountPhase(): void {
  activeMounts--;
}

/**
 * @internal
 * Returns whether a mount()/hydrate() attach is currently running.
 */
export function isMountInFlight(): boolean {
  return activeMounts > 0;
}

/**
 * @internal
 * Marks a root whose subtree state a sync `cleanupSubtree` just removed — `collectRemovedNode`
 * skips re-walking such roots on the observer's removal records (the state is gone by
 * construction). `cleanedMarksExist` gates the additions-side unmark climb: first-create
 * workloads (the common page load) never iterate additions for this purpose.
 * @param root The cleaned subtree root to mark
 */
export function markCleanedRoot(root: Node): void {
  cleanedRoots.add(root);
  cleanedMarksExist = true;
}

/**
 * @internal
 * Schedules cleanup queue processing via microtask.
 */
export function scheduleCleanup() {
  if (!isCleanupScheduled) {
    isCleanupScheduled = true;
    queueMicrotask(processCleanupQueue);
  }
}

/**
 * @internal
 * Collects a removed node into the cleanup queue, descending through stateless
 * element children. Returns whether any state-carrying node was queued.
 * A state-carrying text node queues (a fragment root's scope can ride a text child,
 * e.g. a JSX fragment `<>a b</>`); stateless text — the common case — keeps the cheap skip.
 * @param node The removed node to collect
 * @returns Whether any state-carrying node was queued
 */
export function collectRemovedNode(node: Node): boolean {
  // A sync-cleaned root's subtree state is gone by construction (everything under it was
  // `clean`ed) — re-walking it just burns the removal-path budget twice.
  if (cleanedRoots.has(node)) return false;
  if (node.nodeType === Node.TEXT_NODE && !hasState(node)) return false;
  if (hasState(node)) {
    cleanupQueue.add(node);
    return true; // cleanupSubtree traverses this node's descendants — walking them here too doubles the removal cost
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return false;
  const children = (node as Element).childNodes;
  let queued = false;
  let i = 0;
  const len = children.length;
  while (i < len) queued = collectRemovedNode(children[i++]!) || queued;
  return queued;
}

/**
 * Creates the scoped MutationObserver on mount targets for cleanup/mount tracking.
 */
function ensureContainerObserver() {
  if (containerObserver || !hasDocument()) return;
  let hasRemovals = false;

  containerObserver = new MutationObserver((mutationsList) => {
    let hasAdditions = false;
    hasRemovals = false;

    let i = 0;
    const mLen = mutationsList.length;
    while (i < mLen) {
      const mutation = mutationsList[i++]!;
      const { removedNodes, addedNodes } = mutation;

      let ri = 0;
      const rLen = removedNodes.length;
      while (ri < rLen) {
        if (collectRemovedNode(removedNodes[ri++]!)) hasRemovals = true;
      }

      let ai = 0;
      const aLen = addedNodes.length;
      while (ai < aLen) {
        const addedNode = addedNodes[ai++]!;
        const isElement = addedNode.nodeType === Node.ELEMENT_NODE;
        // A moved state-carrying node keeps its state across re-parenting — without
        // re-registration the new ancestor's overlay misses it and its subtree cleanup
        // would skip it. Ungated: additions iteration cannot stay behind the hook gate.
        const addedState = isElement ? peekState(addedNode) : undefined;
        if (addedState) {
          const registeredIn = addedState.registeredIn;
          if (registeredIn) peekState(registeredIn)?.dirtyChildren?.delete(addedNode);
          registerOverlay(addedNode, addedState);
        }
        // A cleaned root re-inserted with fresh state mounted under (or on) it must not skip
        // the walk when removed again — unmark the added node and every ancestor up to the
        // observed container (a marked grandparent is stale even when the direct parent is
        // unmarked). Gated on cleanedMarksExist so first-create workloads never iterate.
        if (cleanedMarksExist && isElement) {
          cleanedRoots.delete(addedNode);
          let p: Node | null = addedNode.parentNode;
          while (p && !observedContainers.has(p as Element | ShadowRoot)) {
            cleanedRoots.delete(p);
            p = p.parentNode;
          }
        }
        // Track additions only while the afterMount walk can consume them. An ungated add
        // retains every inserted element in this strong Set forever — hook-free apps (the
        // common case) never schedule the drain, so cleared subtrees show as Detached memory.
        if (mountHooksExist && isElement) {
          mountQueue.add(addedNode);
          hasAdditions = true;
        }
      }
    }

    if (hasRemovals) scheduleCleanup();

    if (hasAdditions && !isMountScheduled) {
      isMountScheduled = true;
      queueMicrotask(processMountQueue);
    }
  });
}

/**
 * @internal
 * Registers a container (element or shadow root) for MutationObserver-based cleanup/mount tracking.
 * @param container The container to observe
 */
export function registerContainer(container: Element | ShadowRoot) {
  if (observedContainers.has(container)) return;
  observedContainers.add(container);
  ensureContainerObserver();
  containerObserver!.observe(container, { childList: true, subtree: true });
}

/**
 * @internal
 * Processes all pending cleanup operations.
 */
export function processCleanupQueue() {
  if (isCleaning) return;
  isCleanupScheduled = false;
  if (cleanupQueue.size === 0) return;
  isCleaning = true;

  const nodes = Array.from(cleanupQueue);
  let i = 0;
  const len = nodes.length;
  while (i < len) {
    const node = nodes[i++]!;
    if ((node as ChildNode).isConnected) continue;
    cleanupSubtree(node);
  }

  cleanupQueue.clear();

  isCleaning = false;
}

/**
 * Queues an inserted root node for the afterMount mount walk and schedules the
 * flush. This is the delivery path for content inserted into a target the
 * scoped observer does not watch — Portal's remote target is the case: only
 * mount/hydrate roots are registered containers, so without this the inserted
 * subtree's afterMount hooks would never fire. Element nodes only, mirroring
 * the observer's addition filter; the walk itself is idempotent (isMounted).
 * @param node The inserted root node to walk.
 */
export function queueMountWalk(node: Node): void {
  if (node.nodeType !== Node.ELEMENT_NODE) return;
  if (!mountHooksExist) return; // no walk can consume the queue — adding would only retain the node
  mountQueue.add(node);
  if (!isMountScheduled) {
    isMountScheduled = true;
    queueMicrotask(processMountQueue);
  }
}

/**
 * @internal
 * Processes all pending mount operations.
 */
export function processMountQueue() {
  if (isMounting) return;
  isMounting = true;
  isMountScheduled = false;

  if (mountHooksExist) {
    const nodes = Array.from(mountQueue);
    let i = 0;
    const len = nodes.length;
    while (i < len) {
      const node = nodes[i++]!;
      if (!(node as ChildNode).isConnected) continue;
      traverseDescendants(node, (n) => {
        if (n.nodeType !== Node.ELEMENT_NODE) return;
        const state = peekState(n);
        if (!state) return;
        if (state.isMounted) return; // idempotent: a re-flush (or observer re-fire) must not double-fire afterMount
        state.isMounted = true;
        if (state.hooks) runHooks(n, "afterMount", state);
      });
    }
  }
  mountQueue.clear();

  isMounting = false;
}

/**
 * @internal
 * Test/introspection: node counts currently held in the cleanup and mount queues.
 * Both return to zero after the microtask drain; a nonzero mount count in a hook-free
 * app means added elements are being retained (Detached memory).
 */
export function queueCounts(): { cleanup: number; mount: number } {
  return { cleanup: cleanupQueue.size, mount: mountQueue.size };
}

/**
 * @internal
 * Resets all queue state — clears queues, resets scheduling flags, disconnects container observer.
 */
export function resetQueueState() {
  cleanupQueue.clear();
  mountQueue.clear();
  isCleaning = false;
  isMounting = false;
  isCleanupScheduled = false;
  isMountScheduled = false;
  mountHooksExist = false;
  activeMounts = 0;
  cleanedRoots = new WeakSet();
  cleanedMarksExist = false;
  observedContainers = new WeakSet();
  if (containerObserver) {
    containerObserver.disconnect();
    containerObserver = null;
  }
}
