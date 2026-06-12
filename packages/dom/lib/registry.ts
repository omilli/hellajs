import { effect } from "./internal/core";
import { runHooks } from "./internal/cleanup";
import { getState } from "./internal/state";
import type { HookType } from "./types/nodes";

/**
 * Registry API for managing element effects, events, and hooks.
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
    const dispose = effect(() => {
      state.mounted && runHooks(node, "beforeUpdate");
      effectFn();
      state.mounted && runHooks(node, "afterUpdate");
    });

    state.effects.push(dispose);
  },

  /**
   * Registers a delegated event handler on an element.
   * Replacement: calling again with the same type overwrites the previous handler.
   * Handler count is tracked for fast-exit optimization in event delegation.
   * @param element Target element
   * @param type Event type (e.g., 'click', 'input')
   * @param handler Event handler function
   */
  addEvent(element: Element, type: string, handler: EventListener) {
    getState(element).handlers[type] = handler;
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
