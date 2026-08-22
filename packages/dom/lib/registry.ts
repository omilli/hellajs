import { effect } from "./internal/core";
import { runHooks } from "./internal/cleanup";
import { getState } from "./internal/state";
import { dispatchError, toError, resolveErrorConfig } from "./internal/dispatch";
import { isMountInFlight, noteMountHook } from "./internal/queue";
import type { HookType, HookFn } from "./types/nodes";

/**
 * Registry API for managing element effects and hooks.
 * All operations store data in a WeakMap for automatic cleanup.
 */
export const registry = {
  /**
   * Registers a reactive effect on an element with update hooks.
   * Accumulative: multiple calls stack effects on the same element.
   * Effect is automatically disposed when element is removed from DOM.
   * @param node Target node
   * @param effectFn Effect function to run
   */
  addEffect(node: Node, effectFn: () => void) {
    const state = getState(node);
    const effects = state.effects ?? (state.effects = []);
    const el = node as Element;
    const dispose = effect(() => {
      // update hooks gate: hooks rarely exist — two property loads, not two WeakMap gets per run.
      // isMounted resolves lazily from isConnected so hooks added post-mount still fire on updates.
      if (state.hooks && (state.isMounted || (state.isMounted = el.isConnected))) {
        try {
          runHooks(node, "beforeUpdate");
        } catch (err) {
          dispatchError(toError(err), { phase: "update", element: el, config: resolveErrorConfig(el) });
        }
      }
      effectFn();
      if (state.hooks && state.isMounted) {
        try {
          runHooks(node, "afterUpdate");
        } catch (err) {
          dispatchError(toError(err), { phase: "update", element: el, config: resolveErrorConfig(el) });
        }
      }
    });

    effects.push(dispose);
  },

  /**
   * Registers a lifecycle hook on an element.
   * Accumulative: multiple calls stack hooks of the same type and all execute.
   * @param element Target element
   * @param type Hook type (beforeMount, afterMount, etc.)
   * @param handler Hook function (with or without element parameter)
   */
  addHook(
    element: Element,
    type: HookType,
    handler: HookFn
  ) {
    noteMountHook();
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
};
