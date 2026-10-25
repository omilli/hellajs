import type { HookType, HookFn } from "../types/nodes";
import type { ElementState } from "../internal/state";
import { isMountInFlight, setMountQueueArm } from "../internal/queue";
import { runHooks, traverseDescendants } from "../internal/cleanup";
import { dispatchError, resolveErrorConfig, toError } from "../internal/dispatch";
import { getState, peekState } from "../internal/state";
import { setHooksFeature } from "../registry";

/**
 * Queue of nodes pending mount processing.
 */
const mountQueue = new Set<Node>();

let isMounting = false;
let isMountScheduled = false;

/** True once any lifecycle hook has been registered — gates the afterMount walk. */
let mountHooksExist = false;

/**
 * Schedules the mount-queue flush via microtask.
 */
function scheduleDrain() {
  if (!isMountScheduled) {
    isMountScheduled = true;
    queueMicrotask(processMountQueue);
  }
}

/**
 * Queues a node unconditionally — the delivery path for mount()/hydrate() roots
 * and `$ref` targets whose afterMount hooks the scoped observer misses.
 * @param node The node to queue for the afterMount walk.
 */
function queueMount(node: Node): void {
  mountQueue.add(node);
  scheduleDrain();
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
function queueMountWalk(node: Node): void {
  if (node.nodeType !== Node.ELEMENT_NODE) return;
  if (!mountHooksExist) return; // no walk can consume the queue — adding would only retain the node
  mountQueue.add(node);
  scheduleDrain();
}

/**
 * Tracks one observer-reported added element. Additions are queued only while the
 * afterMount walk can consume them: an ungated add retains every inserted element
 * in this strong Set forever — apps whose hooks were never registered never
 * schedule the drain, so cleared subtrees show as Detached memory.
 * @param node The added element
 */
function collectAdded(node: Node): void {
  if (!mountHooksExist) return;
  mountQueue.add(node);
  scheduleDrain();
}

/**
 * Processes all pending mount operations.
 */
function processMountQueue() {
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
 * Registers a lifecycle hook on an element.
 * Accumulative: multiple calls stack hooks of the same type and all execute.
 * @param element Target element
 * @param type Hook type (beforeMount, afterMount, etc.)
 * @param handler Hook function (with or without element parameter)
 */
function addHook(element: Element, type: HookType, handler: HookFn) {
  mountHooksExist = true;
  const state = getState(element);
  const stacks = state.hooks ?? (state.hooks = {});
  (stacks[type] || (stacks[type] = [])).push(handler);
  // afterMount registered on an already-mounted node fires immediately (the node is already mounted);
  // isConnected resolves "already-mounted" for nodes whose mount predates any hook registration,
  // and isMounted is set so the flush walk does not double-fire
  if (type === "afterMount" && (state.isMounted || (element.isConnected && !isMountInFlight()))) {
    state.isMounted = true;
    (handler as (node: Element) => void)(element);
  }
}

/**
 * Resets the mount queue and its scheduling state.
 */
function resetMountState() {
  mountQueue.clear();
  isMounting = false;
  isMountScheduled = false;
  mountHooksExist = false;
}

/**
 * Runs one registered effect body with the update-hook bracket.
 * The update hooks gate: hooks rarely exist — two property loads, not two WeakMap gets per run.
 * isMounted resolves lazily from isConnected so hooks added post-mount still fire on updates.
 * The lazy assignment is suppressed while a mount/hydrate attach is in flight: hydration
 * adopts elements that are ALREADY connected, so without the guard a hooked element hosting
 * an effect (e.g. a tablist carrying its items region) self-marks isMounted during the
 * attach and the flush walk's idempotence gate then never fires its afterMount.
 * @param node The registered node
 * @param state The node's element state (captured by the caller — no WeakMap re-read per run)
 * @param effectFn The registered effect body
 */
function runEffectHooks(node: Node, state: ElementState, effectFn: () => void): void {
  const el = node as Element;
  if (
    state.hooks &&
    (state.isMounted || (!isMountInFlight() && (state.isMounted = el.isConnected)))
  ) {
    try {
      runHooks(node, "beforeUpdate", state);
    } catch (err) {
      dispatchError(toError(err), {
        phase: "update",
        element: el,
        config: resolveErrorConfig(el),
      });
    }
  }
  effectFn();
  if (state.hooks && state.isMounted) {
    try {
      runHooks(node, "afterUpdate", state);
    } catch (err) {
      dispatchError(toError(err), {
        phase: "update",
        element: el,
        config: resolveErrorConfig(el),
      });
    }
  }
}

setMountQueueArm({
  queueMount,
  drain: processMountQueue,
  walk: queueMountWalk,
  collectAdded,
  reset: resetMountState,
  count: () => mountQueue.size,
});
setHooksFeature({ addHook, runEffectHooks });
