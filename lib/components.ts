import { effect, type Signal } from "./reactive";
import type { HTMLAttributeMap } from "./types";
import type { HTMLTagName, VNode, VNodeProps, VNodeValue } from "./types/dom";
import { Scope, getCurrentScope, setCurrentScope, Context } from "./context";

export interface ComponentContext extends Scope {
  isMounted: boolean;
  contexts: Map<Context<unknown>, unknown>;
}

export interface ComponentLifecycle {
  onMount?: () => void;
  onUpdate?: () => void;
  onUnmount?: () => void;
}

export function Component<T>(renderFn: () => VNode) {
  const context: ComponentContext = {
    effects: new Set(),
    signals: new Set<Signal<unknown>>(),
    contexts: new Map(),
    isMounted: false,
    parent: getCurrentScope() || undefined,
    cleanup: () => {
      for (const cleanup of context.effects) {
        cleanup();
      }
      context.effects.clear();
      for (const signal of context.signals) {
        signal.cleanup();
      }
      context.signals.clear();
      context.contexts.clear();
      context.isMounted = false;
      context.parent = undefined;
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

type HTMLElementProxy = {
  [K in keyof HTMLAttributeMap]: {
    (
      props: VNodeProps<K>,
      ...children: VNodeValue[]
    ): VNode<K>;
    (...children: VNodeValue[]): VNode<K>;
  };
};

type HTMLElementFactory<T extends HTMLTagName = HTMLTagName> = {
  (props: VNodeProps<T>, ...children: VNodeValue[]): VNode<T>;
  (...children: VNodeValue[]): VNode<T>;
};

interface HTMLTagCache {
  [tagName: string]: HTMLElementFactory;
}

export const html: HTMLElementProxy = new Proxy(
  {} as HTMLTagCache,
  {
    get(target, tag: string): HTMLElementFactory {
      if (tag in target) {
        return target[tag];
      }

      const factory: HTMLElementFactory = (
        propsOrChild?: VNodeProps | VNodeValue,
        ...children: VNodeValue[]
      ): VNode => {
        const hasProps = propsOrChild !== null &&
          typeof propsOrChild === 'object' &&
          !Array.isArray(propsOrChild) &&
          !(propsOrChild instanceof Function) &&
          !('tag' in propsOrChild && 'props' in propsOrChild && 'children' in propsOrChild);

        const props = hasProps ? (propsOrChild as VNodeProps) : {};
        const childArgs = hasProps ? children : [propsOrChild, ...children];

        return {
          tag: tag as HTMLTagName,
          props,
          children: childArgs as VNodeValue[],
        };
      };

      target[tag] = factory;
      return factory;
    },
  }
) as HTMLElementProxy;

export function For<T>(
  data: Signal<T[]>,
  mapFn: (item: T, index: number) => VNode
) {
  return () => data().map((item, index) => {
    const vNode = mapFn(item, index);
    vNode._item = item;
    return vNode;
  });
}