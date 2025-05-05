import type { Context } from "./context";
import { effect } from "./effect";
import { createScope, getCurrentScope, setCurrentScope, type Scope } from "./scope";
import type { VNode } from "./types";

export interface ComponentContext extends Scope {
  isMounted: boolean;
  contexts: Map<Context<unknown>, unknown>;
}

export interface ComponentLifecycle {
  onMount?: () => void;
  onUpdate?: () => void;
  onUnmount?: () => void;
}

export function Component(renderFn: () => VNode) {
  const scope = createScope(getCurrentScope());
  const context: ComponentContext = {
    ...scope,
    contexts: new Map(),
    isMounted: false,
    cleanup: () => {
      scope.cleanup();
      context.contexts.clear();
      context.isMounted = false;
      fn.onUnmount?.();
    },
  };

  const fn = function () {
    const prevScope = getCurrentScope();
    setCurrentScope(context);

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
      setCurrentScope(prevScope);
    }
  } as (() => VNode) & ComponentLifecycle;

  return fn;
}