import { removeDirectHandlers } from "./events";
import { deleteState, peekState } from "./state";
import type { ElementState } from "./state";
import type { HookType } from "../types/nodes";

let cleanedRootMarker: ((root: Node) => void) | null = null;

/**
 * @internal
 * Wires the cleaned-root marker from queue.ts — the mark state lives with the observer
 * (queue.ts imports cleanupSubtree from here, so this module must not import queue.ts).
 * A null marker (queue.ts never loaded) leaves no marks and the observer skip never engages.
 */
export function setCleanedRootMarker(mark: (root: Node) => void): void {
  cleanedRootMarker = mark;
}

/**
 * @internal
 * Runs all hooks of the given type on a node.
 * Passes the element to hooks that expect it (excludes beforeMount, afterDestroy).
 * @param node The DOM node to run hooks on
 * @param type The hook type to run
 * @param state Pre-fetched state — pass when the caller already holds it to skip the WeakMap read
 */
export function runHooks(node: Node, type: HookType, state?: ElementState) {
  const hooks = (state ?? peekState(node))?.hooks?.[type];
  if (!hooks) return;
  const len = hooks.length;
  if (len === 0) return;

  const el = node as Element;
  let i = 0;
  while (i < len) {
    const hook = hooks[i]!;
    i++;
    if (type !== "beforeMount" && type !== "afterDestroy") {
      (hook as (node: Element) => void)(el);
    } else {
      (hook as () => void)();
    }
  }
}

/**
 * @internal
 * Disposes a single node: runs hooks, calls cleanup functions, removes handlers, drains the
 * dirty-children overlay (nearest state-carrying descendants — still-descendant children recurse,
 * stale links from moved-out nodes drop), unregisters from its own ancestor's overlay, then
 * deletes state last so children's unregister reads survive.
 * @param node The DOM node to clean up
 */
function clean(node: Node) {
  const state = peekState(node);
  if (!state) return;

  runHooks(node, "beforeDestroy", state);

  state.componentScope?.();
  state.portalCleanup?.();
  state.forEachCleanup?.();
  state.lazyCleanup?.();
  state.transitionCleanup?.();
  state.suspenseCleanup?.();

  const effects = state.effects;
  if (effects) {
    let i = 0;
    const len = effects.length;
    while (i < len) {
      effects[i++]!();
    }
    effects.length = 0;
  }

  if (state.directHandlers) removeDirectHandlers(node, state.directHandlers);

  runHooks(node, "afterDestroy", state);

  const dirty = state.dirtyChildren;
  if (dirty) {
    const children = Array.from(dirty);
    let ci = 0;
    const cLen = children.length;
    while (ci < cLen) {
      const child = children[ci++]!;
      let p = child.parentNode;
      while (p && p !== node) p = p.parentNode;
      if (p === node) {
        clean(child);
      } else {
        dirty.delete(child);
      }
    }
  }

  const registeredIn = state.registeredIn;
  if (registeredIn) peekState(registeredIn)?.dirtyChildren?.delete(node);

  deleteState(node);
}

/**
 * @internal
 * Drains a persistent region anchor's component state at reactive-region re-run start: runs the
 * five component cleanup slots (`componentScope` excluded — the anchor never carries a component
 * scope) and drains `effects`, then clears them. Unlike `clean`, keeps the state entry — the
 * region anchor persists across re-renders, only its per-run occupants are disposed.
 * @param node The region anchor to drain
 */
export function drainAnchorCleanup(node: Node) {
  const state = peekState(node);
  if (!state) return;

  state.portalCleanup?.();
  state.forEachCleanup?.();
  state.lazyCleanup?.();
  state.transitionCleanup?.();
  state.suspenseCleanup?.();

  const effects = state.effects;
  if (effects) {
    let i = 0;
    const len = effects.length;
    while (i < len) {
      effects[i++]!();
    }
    effects.length = 0;
  }
}

/**
 * @internal
 * Iteratively traverses all descendants of a node using a stack.
 * @param node The root node to traverse from
 * @param callback Function called for each descendant
 */
export function traverseDescendants(node: Node, callback: (node: Node) => void) {
  const stack: Node[] = [node];
  let current: Node | undefined;

  while ((current = stack.pop())) {
    callback(current);

    if (current.nodeType === Node.ELEMENT_NODE && current.hasChildNodes()) {
      const children = current.childNodes;
      let i = children.length;
      while (i--) stack.push(children[i]!);
    }
  }
}

/**
 * @internal
 * Cleans up a node and all its descendants. A state-carrying root takes the overlay fast path —
 * `clean` reaches every state-carrying descendant transitively via `dirtyChildren`. A stateless
 * root keeps the full walk (external-removal safety net for stateless wrapper roots); a
 * state-carrying descendant it reaches drains its own overlay through `clean`. After the clean
 * completes the root is marked so the observer's removal record for it skips the re-walk.
 * @param root The root node to clean up
 */
export function cleanupSubtree(root: Node) {
  if (peekState(root)) {
    clean(root);
  } else {
    traverseDescendants(root, clean);
  }
  cleanedRootMarker?.(root);
}
