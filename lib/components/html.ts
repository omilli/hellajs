import type { HTMLAttributeMap, HTMLTagName, VNode, VNodeProps, VNodeValue } from "../types";

type FragmentFactory = {
  (props: Record<string, any>, ...children: VNodeValue[]): VNode;
  (...children: VNodeValue[]): VNode;
};

type HTMLElementFactory<T extends HTMLTagName = HTMLTagName> = {
  (props: VNodeProps<T>, ...children: VNodeValue[]): VNode<T>;
  (...children: VNodeValue[]): VNode<T>;
};

type HTMLElementProxy = {
  [K in keyof HTMLAttributeMap]: HTMLElementFactory<K>;
} & {
  $: FragmentFactory;
};

interface HTMLTagCache {
  [tagName: string]: HTMLElementFactory | FragmentFactory;
  $: FragmentFactory;
}

function extractArgs(propsOrChild: any, children: VNodeValue[]): [Record<string, any>, VNodeValue[]] {
  const hasProps = propsOrChild !== null &&
    typeof propsOrChild === 'object' &&
    !Array.isArray(propsOrChild) &&
    !(propsOrChild instanceof Function) &&
    !('tag' in propsOrChild && 'props' in propsOrChild && 'children' in propsOrChild);

  const props = hasProps ? propsOrChild : {};
  const childArgs = hasProps ? children : [propsOrChild, ...children].filter(c => c !== undefined);

  return [props, childArgs];
}

export const html: HTMLElementProxy = new Proxy(
  {
    $: (propsOrChild?: any, ...children: VNodeValue[]): VNode => {
      const [props, childArgs] = extractArgs(propsOrChild, children);

      return {
        tag: '$' as unknown as HTMLTagName,
        props,
        children: childArgs as VNodeValue[],
      };
    }
  } as HTMLTagCache,
  {
    get(target, tag: string): HTMLElementFactory {
      if (tag in target) {
        return target[tag];
      }

      const factory: HTMLElementFactory = (
        propsOrChild?: VNodeProps | VNodeValue,
        ...children: VNodeValue[]
      ): VNode => {
        const [props, childArgs] = extractArgs(propsOrChild, children);

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