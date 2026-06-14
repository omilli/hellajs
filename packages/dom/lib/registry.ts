import { effect } from "./internal/core";
import { runHooks } from "./internal/cleanup";
import { getState } from "./internal/state";
import { dispatchError, toError, resolveErrorConfig } from "./internal/dispatch";
import type { HookType } from "./types/nodes";

/**
 * Registry API for managing element effects and hooks.
 * All operations store data in a WeakMap for automatic cleanup.
 */
export const registry = {
  /**
   * Registers a reactive effect on an element with update hooks.
   * Accumulative: multiple calls stack effects on the same element.
   * Effect is automatically disposed when element is removed from DOM.
   * @param element Target element
   * @param effectFn Effect function to run
   */
  addEffect(node: Node, effectFn: () => void) {
    const state = getState(node);
    const el = node as Element;
    const dispose = effect(() => {
      if (state.isMounted) {
        try {
          runHooks(node, "beforeUpdate");
        } catch (err) {
          dispatchError(toError(err), { phase: 'update', element: el, config: resolveErrorConfig(el) });
        }
      }
      effectFn();
      if (state.isMounted) {
        try {
          runHooks(node, "afterUpdate");
        } catch (err) {
          dispatchError(toError(err), { phase: 'update', element: el, config: resolveErrorConfig(el) });
        }
      }
    });

    state.effects.push(dispose);
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
    handler: (() => void) | ((node: Element) => void)
  ) {
    const stacks = getState(element).hooks;
    (stacks[type] || (stacks[type] = [])).push(handler);
  }
};
