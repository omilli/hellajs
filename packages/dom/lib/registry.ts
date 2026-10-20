import { effect } from "./internal/core";
import { getState } from "./internal/state";
import type { ElementState } from "./internal/state";
import type { HookType, HookFn } from "./types/nodes";

/**
 * Hook registration signature — the hooks feature's `addHook` implementation.
 */
type AddHookFn = (element: Element, type: HookType, handler: HookFn) => void;

/**
 * Effect-body signature — the hooks feature's `runEffectHooks` implementation.
 */
type RunEffectHooksFn = (node: Node, state: ElementState, effectFn: () => void) => void;

/**
 * Default no-op registration — replaced when the hooks feature loads.
 */
const addHookNoop: AddHookFn = () => {};

/**
 * @internal
 * Runs one registered effect body. The default (hooks feature not loaded) runs the
 * body bare — no hook was ever registered, so the update-hook bracket is dead weight.
 *
 * Exported `let` is deliberate: the feature swaps the implementation at module init
 * through {@link setHooksFeature} (the `setMountNode` injection pattern) while every
 * importer keeps the live binding. Runs on every effect flush — the hot path.
 * @param node The registered node
 * @param state The node's element state (captured by the caller — no WeakMap re-read per run)
 * @param effectFn The registered effect body
 */
export let runEffectHooks: RunEffectHooksFn = (_node, _state, effectFn) => {
  effectFn();
};

/**
 * The hooks feature's registry implementations, registered at its module init.
 */
interface HooksFeature {
  addHook: AddHookFn;
  runEffectHooks: RunEffectHooksFn;
}

/**
 * Registry API for managing element effects and hooks.
 * All operations store data in a WeakMap for automatic cleanup.
 */
export const registry = {
  /**
   * Registers a reactive effect on an element with update hooks.
   * Accumulative: multiple calls stack effects on the same element.
   * Effect is automatically disposed when element is removed from DOM.
   * The beforeUpdate/afterUpdate bracket is the hooks feature's `runEffectHooks`
   * (a bare body run when the feature is not loaded).
   * @param node Target node
   * @param effectFn Effect function to run
   */
  addEffect(node: Node, effectFn: () => void) {
    const state = getState(node);
    const effects = state.effects ?? (state.effects = []);
    const dispose = effect(() => runEffectHooks(node, state, effectFn));
    effects.push(dispose);
  },

  /**
   * Registers a lifecycle hook on an element.
   * Accumulative: multiple calls stack hooks of the same type and all execute.
   *
   * Feature-gated seam: the default (hooks feature not loaded) is a no-op — `hook:`
   * JSX loads the feature via the babel plugin, and direct `registry.addHook` callers
   * need the documented `import "@hellajs/dom/features/hooks"` escape hatch.
   * @param element Target element
   * @param type Hook type (beforeMount, afterMount, etc.)
   * @param handler Hook function (with or without element parameter)
   */
  addHook: addHookNoop,
};

/**
 * @internal
 * Registers the hooks feature's registry implementations (the `setMountNode` injection
 * pattern — hook registration and the effect-body update-hook bracket live in
 * `lib/features/hooks.ts` so hook lifecycle wiring tree-shakes out of hook-free
 * bundles).
 * @param feature The hook registration + effect-body implementations
 */
export function setHooksFeature(feature: HooksFeature): void {
  registry.addHook = feature.addHook;
  runEffectHooks = feature.runEffectHooks;
}
