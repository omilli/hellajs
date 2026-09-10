import { removeDirectHandlers } from "./events";
import { deleteState, peekState } from "./state";
import type { HookType } from "../types/nodes";

/**
 * @internal
 * Runs all hooks of the given type on a node.
 * Passes the element to hooks that expect it (excludes beforeMount, afterDestroy).
 * @param node The DOM node to run hooks on
 * @param type The hook type to run
 */
export function runHooks(node: Node, type: HookType) {
  const hooks = peekState(node)?.hooks?.[type];
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
 * Disposes a single node: runs hooks, calls cleanup functions, removes handlers, deletes state.
 * @param node The DOM node to clean up
 */
function clean(node: Node) {
  const state = peekState(node);
  if (!state) return;

  runHooks(node, "beforeDestroy");

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

  removeDirectHandlers(node);

  runHooks(node, "afterDestroy");

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
 * Cleans up a node and all its descendants.
 * @param root The root node to clean up
 */
export function cleanupSubtree(root: Node) {
  traverseDescendants(root, clean);
}
