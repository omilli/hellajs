import type { Context } from "./context";
import { effect, scope, getCurrentScope, setCurrentScope, type Scope } from "../reactive";
import type { VNode } from "../types";

/**
 * Represents the context for a component, extending the base `Scope`.
 *
 * `@property {boolean} ` - Indicates whether the component is currently mounted.
 * @property {Map<Context<unknown>, unknown>} contexts - A map storing context values associated with their respective context objects.
 */
export interface ComponentContext extends Scope {
  // Indicates whether the component is currently mounted.
  isMounted: boolean;
  // Context values associated with their respective context objects.
  contexts: Map<Context<unknown>, unknown>;
}

/**
 * Defines the lifecycle hooks for a component.
 *
 * Implement this interface to handle component lifecycle events:
 * - `onMount`: Called when the component is mounted.
 * - `onUpdate`: Called when the component is updated.
 * - `onUnmount`: Called when the component is unmounted.
 */
export interface ComponentLifecycle {
  // Called when the component is mounted.
  onMount?: () => void;
  // Called when the component is updated.
  onUpdate?: () => void;
  // Called when the component is unmounted.
  onUnmount?: () => void;
}

/**
 * Creates a component function with its own reactive scope and lifecycle management.
 *
 * @param renderFn - A function that returns a VNode representing the component's rendered output.
 * @returns A component function with attached lifecycle hooks (`onMount`, `onUpdate`, `onUnmount`).
 */
export function Component(renderFn: () => VNode) {
  // Create a new scope for this component
  const componentScope = scope();
  const context: ComponentContext = {
    ...componentScope,
    contexts: new Map(),
    isMounted: false,
    cleanup: () => {
      componentScope.cleanup();
      context.contexts.clear();
      context.isMounted = false;
      fn.onUnmount?.();
    },
  };

  const fn = function () {
    // Store the previous scope so we can set it back later
    // Set the current scope to the component's scope
    const prevScope = getCurrentScope();
    setCurrentScope(context);

    try {
      // Set the context for the component
      const node = (renderFn as () => VNode)() as VNode;
      if (!node.props) node.props = {};
      node.props._context = context;
      // Create onMount and/or onUpdate effects,
      if (!context.isMounted) {
        if (fn.onMount) {
          effect(() => {
            fn.onMount!();
            context.isMounted = true;
          });
        } else {
          context.isMounted = true;
        }
      } else if (fn.onUpdate) {
        effect(() => {
          fn.onUpdate!();
        });
      }

      return node;
    } finally {
      // Restore previous scope
      setCurrentScope(prevScope);
    }
  } as (() => VNode) & ComponentLifecycle;

  return fn;
}