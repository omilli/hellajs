import type { HTMLAttributeMap, HTMLTagName, VNode, VNodeProps, VNodeValue } from "../types";

type FragmentFactory = {
  (props: VNodeProps, ...children: VNodeValue[]): VNode;
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

function extractArgs(
  propsOrChild: VNodeProps | VNodeValue | undefined,
  children: VNodeValue[]
): [VNodeProps, VNodeValue[]] {
  const hasProps =
    propsOrChild !== null &&
    typeof propsOrChild === "object" &&
    !Array.isArray(propsOrChild) &&
    !(propsOrChild instanceof Function) &&
    !(
      typeof propsOrChild === "object" &&
      propsOrChild !== null &&
      "tag" in propsOrChild &&
      "props" in propsOrChild &&
      "children" in propsOrChild
    );

  const props = hasProps ? (propsOrChild as VNodeProps) : {};
  const childArgs = hasProps
    ? children
    : [propsOrChild, ...children].filter((c) => c !== undefined) as VNodeValue[];

  return [props, childArgs];
}

export const html: HTMLElementProxy = new Proxy(
  {
    $: (
      propsOrChild?: VNodeProps | VNodeValue,
      ...children: VNodeValue[]
    ): VNode => {
      const [props, childArgs] = extractArgs(propsOrChild, children);

      return {
        tag: "$" as HTMLTagName,
        props,
        children: childArgs,
      };
    },
  } as HTMLTagCache,
  {
    get(target, tag: string): HTMLElementFactory {
      if (tag in target) {
        return target[tag] as HTMLElementFactory;
      }

      const factory: HTMLElementFactory = (
        propsOrChild?: VNodeProps | VNodeValue,
        ...children: VNodeValue[]
      ): VNode => {
        const [props, childArgs] = extractArgs(propsOrChild, children);

        return {
          tag: tag as HTMLTagName,
          props,
          children: childArgs,
        };
      };

      target[tag] = factory;
      return factory;
    },
  }
) as HTMLElementProxy;