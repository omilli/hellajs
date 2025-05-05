import type { HTMLAttributeMap, HTMLTagName, VNode, VNodeProps, VNodeValue } from "./types";

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