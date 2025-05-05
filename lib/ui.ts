import { effect, type Signal } from "./reactive";
import type { HTMLAttributeMap } from "./types";
import type { HTMLTagName, VNode, VNodeProps, VNodeValue } from "./types/dom";

export interface ComponentContext {
  effects: Set<() => void>;
  signals: Set<Signal<unknown>>;
  cleanup: () => void;
  isMounted: boolean;
  contexts: Map<Context<unknown>, unknown>;
  parent?: ComponentContext;
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

export interface Context<T> {
  id: symbol;
  defaultValue: T;
}

export function createContext<T>(defaultValue: T): Context<T> {
  return {
    id: Symbol('context'),
    defaultValue,
  };
}

export function useContext<T>(context: Context<T>): T {
  const component = getCurrentComponent();
  if (!component) {
    throw new Error('useContext must be called within a Component');
  }

  let current: ComponentContext | undefined = component;
  while (current) {
    if (current.contexts.has(context)) {
      return current.contexts.get(context) as T;
    }
    current = current.parent;
  }

  return context.defaultValue;
}

export function Provider<T>({ context, value, children }: {
  context: Context<T>;
  value: T;
  children: VNodeValue[];
}) {
  const component = getCurrentComponent();
  if (!component) {
    throw new Error('Provider must be used within a Component');
  }

  component.contexts.set(context, value);

  return {
    tag: 'fragment' as HTMLTagName,
    props: {},
    children,
  };
}

export function Component<T>(renderFn: () => VNode) {
  const context: ComponentContext = {
    effects: new Set(),
    signals: new Set<Signal<unknown>>(),
    contexts: new Map(),
    isMounted: false,
    parent: getCurrentComponent() || undefined,
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