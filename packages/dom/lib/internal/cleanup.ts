import { handlerCounts } from "./counts";
import { removeDirectHandlers } from "./direct-events";
import { getState, hasState, deleteState, peekState } from "./element-map";
import type { HookType } from "../types/nodes";

function runHooks(node: Node, type: HookType) {
  const hooks = peekState(node)?.hooks[type];
  if (!hooks) return;
  const len = hooks.length;
  if (len === 0) return;

  const passNode = type !== "beforeMount" && type !== "afterDestroy";
  const el = node as Element;
  let i = 0;
  while (i < len) {
    passNode ? (hooks[i++] as (node: Element) => void)(el) : (hooks[i++] as () => void)();
  }
}

function clean(node: Node) {
  if (!hasState(node)) return;

  runHooks(node, "beforeDestroy");

  const state = getState(node);

  state.componentScope?.();
  state.portalCleanup?.();
  state.lazyCleanup?.();

  let i = 0;
  const len = state.effects.length;
  while (i < len) {
    state.effects[i++]!();
  }
  state.effects.length = 0;

  removeDirectHandlers(node);

  const handlerKeys = Object.keys(state.handlers);
  i = 0;
  const hLen = handlerKeys.length;
  while (i < hLen) {
    const type = handlerKeys[i++]!;
    const count = handlerCounts.get(type);
    count !== undefined &&
      count > 1 ? handlerCounts.set(type, count - 1) : handlerCounts.delete(type);
  }

  runHooks(node, "afterDestroy");

  deleteState(node);
}

function traverseDescendants(node: Node, callback: (node: Node) => void) {
  const stack: Node[] = [node];
  let current: Node | undefined;

  while ((current = stack.pop())) {
    callback(current);

    if (current.nodeType === 1 && current.hasChildNodes()) {
      const children = current.childNodes;
      let i = children.length;
      while (i--) stack.push(children[i]!);
    }
  }
}

export function cleanupSubtree(root: Node) {
  traverseDescendants(root, clean);
}

export { traverseDescendants, runHooks };
