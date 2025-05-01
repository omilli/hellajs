import { effect } from "./reactive";
import type { VNode, VNodeProps, VNodeValue, Signal } from "./types";
import { html } from "./html";

export interface LifecycleHooks {
  onMount?: () => void;
  onUpdate?: () => void;
  onUnmount?: () => void;
}

export interface ComponentContext {
  effects: Set<() => void>;
  cleanup: () => void;
  isMounted: boolean;
}

export let currentComponent: ComponentContext | null = null;

export function Component(
  renderFn: () => VNode,
  hooks: LifecycleHooks = {}
): () => VNode {
  const context__: ComponentContext = {
    effects: new Set(),
    isMounted: false,
    cleanup: () => {
      context__.effects.forEach((cleanup) => cleanup());
      context__.effects.clear();
      context__.isMounted = false;
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

      if (!context__.isMounted) {
        if (hooks.onMount) {
          effect(() => {
            hooks.onMount!();
            context__.isMounted = true;
          });
        } else {
          context__.isMounted = true;
        }
      } else if (hooks.onUpdate) {
        effect(() => {
          hooks.onUpdate!();
        });
      }

      return node;
    } finally {
      currentComponent = prevComponent;
    }
  };
}