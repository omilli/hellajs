import { effect } from "./reactive";
import type { ComponentContext, LifecycleHooks, VNode, Signal } from "./types";

export let currentComponent: ComponentContext | null = null;

export function Component<T>(renderFn: () => VNode) {
  const context: ComponentContext = {
    effects: new Set(),
    signals: new Set<Signal<unknown>>(),
    isMounted: false,
    cleanup: () => {
      for (const cleanup of context.effects) {
        cleanup();
      }
      context.effects.clear();
      for (const signal of context.signals) {
        signal.cleanup();
      }
      context.signals.clear();
      context.isMounted = false;
      fn.onUnmount?.();
    },
  };

  const fn = function () {
    const prevComponent = currentComponent;
    currentComponent = context;

    try {
      const node = (renderFn as () => VNode)() as VNode;

      if (!node.props) node.props = {};

      node.props.__componentContext = context;

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
      currentComponent = prevComponent;
    }
  } as (() => VNode) & LifecycleHooks;

  return fn;
}