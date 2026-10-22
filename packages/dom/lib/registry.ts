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
 * Registration-time gate: flipped only by {@link setHooksFeature}. Features load at
 * module init (before any render), so an effect registered while this is false takes
 * the bare path and never gains the update-hook bracket at run time.
 */
let hooksFeatureActive = false;

/**
 * @internal
 * Placeholder for the update-hook bracket — never invoked while default: the
 * feature-less `addEffect` path registers the body bare, bypassing this seam
 * entirely. Replaced when the hooks feature loads.
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
   * The effect is registered `separate` — the effects array owns its lifetime, no
   * parent link to the enclosing effect.
   * While the hooks feature is loaded the body routes through the feature's
   * `runEffectHooks` (the beforeUpdate/afterUpdate bracket); unloaded, the body
   * registers bare — no wrapper closure.
   * @param node Target node
   * @param effectFn Effect function to run
   */
  addEffect(node: Node, effectFn: () => void) {
    const state = getState(node);
    const effects = state.effects ?? (state.effects = []);
    if (hooksFeatureActive) {
      effects.push(effect(() => runEffectHooks(node, state, effectFn), { separate: true }));
    } else {
      effects.push(effect(effectFn, { separate: true }));
    }
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
  hooksFeatureActive = true;
}
