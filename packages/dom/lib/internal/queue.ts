import { hasDocument } from "./core";
import { cleanupSubtree, traverseDescendants, runHooks } from "./cleanup";
import { peekState, hasState } from "./state";

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
 * Schedules cleanup queue processing via microtask.
 */
export function scheduleCleanup() {
  if (!isCleanupScheduled) {
    isCleanupScheduled = true;
    queueMicrotask(processCleanupQueue);
  }
}

/**
 * Creates the scoped MutationObserver on mount targets for cleanup/mount tracking.
 */
function ensureContainerObserver() {
  if (containerObserver || !hasDocument()) return;
  let hasRemovals = false;

  function registerNode(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) return;
    if (hasState(node)) {
      cleanupQueue.add(node);
      hasRemovals = true;
      return;   // cleanupSubtree traverses this node's descendants — walking them here too doubles the removal cost
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      const children = (node as Element).childNodes;
      let i = 0;
      const len = children.length;
      while (i < len) registerNode(children[i++]!);
    }
  }

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
      while (ri < rLen) registerNode(removedNodes[ri++]!);

      let ai = 0;
      const aLen = addedNodes.length;
      while (ai < aLen) {
        const addedNode = addedNodes[ai++]!;
        if (addedNode.nodeType === Node.ELEMENT_NODE) {
          mountQueue.add(addedNode);
          hasAdditions = true;
        }
      }
    }

    if (hasRemovals) scheduleCleanup();

    if (hasAdditions && mountHooksExist && !isMountScheduled) {
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
        if (state.isMounted) return;   // idempotent: a re-flush (or observer re-fire) must not double-fire afterMount
        state.isMounted = true;
        if (state.hooks) runHooks(n, "afterMount");
      });
    }
  }
  mountQueue.clear();

  isMounting = false;
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
  observedContainers = new WeakSet();
  if (containerObserver) {
    containerObserver.disconnect();
    containerObserver = null;
  }
}


