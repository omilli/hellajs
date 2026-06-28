import { removeDirectHandlers } from "./events";
import { getState, hasState, deleteState, peekState } from "./state";
import type { HookType } from "../types/nodes";

/**
 * @internal
 * Runs all hooks of the given type on a node.
 * Passes the element to hooks that expect it (excludes beforeMount, afterDestroy).
 * @param node The DOM node to run hooks on
 * @param type The hook type to run
 */
export function runHooks(node: Node, type: HookType) {
  const hooks = peekState(node)?.hooks[type];
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
  if (!hasState(node)) return;

  runHooks(node, "beforeDestroy");

  const state = getState(node);

  state.componentScope?.();
  state.portalCleanup?.();
  state.lazyCleanup?.();
  state.transitionCleanup?.();

  let i = 0;
  const len = state.effects.length;
  while (i < len) {
    state.effects[i++]!();
  }
  state.effects.length = 0;

  removeDirectHandlers(node);

  runHooks(node, "afterDestroy");

  deleteState(node);
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
