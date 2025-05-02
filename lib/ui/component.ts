import { effect, type Signal } from "../reactive";
import type { VNode } from "../types";

export interface ComponentContext {
  effects: Set<() => void>;
  signals: Set<Signal<unknown>>;
  cleanup: () => void;
  isMounted: boolean;
}

export interface ComponentLifecycle {
  onMount?: () => void;
  onUpdate?: () => void;
  onUnmount?: () => void;
}

let currentComponent: ComponentContext | null = null;

export const getCurrentComponent = () => currentComponent;

export function setCurrentComponent(component: ComponentContext | null): void {
  currentComponent = component;
}


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

      node.props._context = context;

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
  } as (() => VNode) & ComponentLifecycle;

  return fn;
}