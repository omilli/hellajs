import { effect } from "./reactive";
import type { ComponentContext, LifecycleHooks, VNode } from "./types";

export let currentComponent: ComponentContext | null = null;

export function Component(
  renderFn: () => VNode,
  hooks: LifecycleHooks = {}
): () => VNode {
  const context__: ComponentContext = {
    effects: new Set(),
    cleanup: () => {
      context__.effects.forEach((cleanup) => cleanup());
      context__.effects.clear();
      hooks.onUnmount?.();
    },
  };

  return () => {
    const prevComponent = currentComponent;
    currentComponent = context__;
    try {
      const node = renderFn();
      if (!node.props) node.props = {};
      node.props.__componentContext = context__;
      if (hooks.onMount && !context__.effects.size) {
        effect(() => {
          hooks.onMount!();
        });
      }
      return node;
    } finally {
      currentComponent = prevComponent;
    }
  };
}