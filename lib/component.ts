import { effect } from "./reactive";
import type { VNode, VNodeProps, VNodeValue, Signal } from "./types";
import { html } from "./html";
import { List } from "./list";

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

export function Component<T>(
  renderFnOrData: (() => VNode) | Signal<T[]>,
  mapFn?: (item: T, index: number) => VNode
): (() => VNode) & LifecycleHooks {
  const isSignal = typeof renderFnOrData !== 'function' || "cleanup" in renderFnOrData;

  const fn = function () {
    if (isSignal) {
      return List<T>(
        renderFnOrData as unknown as Signal<T[]>,
        mapFn as (item: T, index: number) => VNode
      )();
    } else {
      const context__: ComponentContext = {
        effects: new Set(),
        isMounted: false,
        cleanup: () => {
          context__.effects.forEach((cleanup) => cleanup());
          context__.effects.clear();
          context__.isMounted = false;
          fn.onUnmount?.();
        },
      };

      const prevComponent = currentComponent;
      currentComponent = context__;
      try {
        const node = (renderFnOrData as () => VNode)() as VNode;
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
    }
  } as LifecycleHooks;

  return fn as (() => VNode) & LifecycleHooks;
}