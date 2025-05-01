import { effect } from "./reactive";
import type { ComponentContext, LifecycleHooks, VNode } from "./types";


export let currentComponent: ComponentContext | null = null;

export function Component<T>(renderFn: () => VNode) {
  const context__: ComponentContext = {
    effects: new Set(),
    isMounted: false,
    cleanup: () => {
      for (const cleanup of context__.effects) {
        cleanup();
      }
      context__.effects.clear();
      context__.isMounted = false;
      fn.onUnmount?.();
    },
  };

  const fn = function () {
    const prevComponent = currentComponent;
    currentComponent = context__;

    try {
      const node = (renderFn as () => VNode)() as VNode;

      if (!node.props) node.props = {};

      node.props.__componentContext = context__;

      if (!context__.isMounted) {
        if (fn.onMount) {
          effect(() => {
            fn.onMount!();
            context__.isMounted = true;
          });
        } else {
          context__.isMounted = true;
        }
      } else if (fn.onUpdate) {
        effect(() => {
          fn.onUpdate!();
        });
      }

      return node;
    } finally {
      currentComponent = prevComponent;
    }
  } as (() => VNode) & LifecycleHooks;

  return fn;
}