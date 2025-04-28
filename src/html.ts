import type { VNode, VNodeProps, VNodeValue } from "./dom";

/**
 * Represents valid HTML tag names.
 */
export type HTMLTagName = keyof HTMLElementTagNameMap;

/**
 * Fragment proxy interface for creating document fragments
 */
export interface HTMLFragmentProxy {
  $: (...children: VNodeValue[]) => VNode;
  Fragment: (...children: VNodeValue[]) => VNode;
}

/**
 * Type representing a proxy object for creating HTML element VNodes.
 */
export type HTMLElementProxy = HTMLFragmentProxy & {
  [K: string]: {
    (
      props?: VNodeProps<HTMLTagName>,
      ...children: VNodeValue[]
    ): VNode<HTMLTagName>;
    (...children: VNodeValue[]): VNode<HTMLTagName>;
  };
};

/**
 * Type representing a function that creates a virtual DOM element.
 */
export type HTMLElementFactory<T extends HTMLTagName = HTMLTagName> = {
  (props: VNodeProps<T>, ...children: VNodeValue[]): VNode<T>;
  (...children: VNodeValue[]): VNode<T>;
};

/**
 * Type representing a cache of HTML tag names and their corresponding element factories.
 */
export interface HTMLTagCache extends HTMLFragmentProxy {
  [tagName: string]: HTMLElementFactory | ((...children: VNode[]) => VNode);
}

/**
 * Proxy object for creating HTML element VNodes with element-specific props.
 */
export const html: HTMLElementProxy = new Proxy(
  {
    $: (...children: VNodeValue[]) => ({ children }) as VNode,
    Fragment: (...children: VNodeValue[]) => ({ children }) as VNode,
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
        const isPropsObject =
          propsOrChild &&
          typeof propsOrChild === 'object' &&
          !Array.isArray(propsOrChild) &&
          !(propsOrChild instanceof Function) &&
          !('type' in propsOrChild && 'props' in propsOrChild && 'children' in propsOrChild);

        const props = isPropsObject ? (propsOrChild as VNodeProps) : {};
        const childArgs = isPropsObject ? children : [propsOrChild, ...children];

        const normalizedChildren = childArgs
          .flat(Infinity)
          .filter(child => child !== undefined && child !== null)
          .map(child => (typeof child === 'string' || typeof child === 'number' ? String(child) : child)) as (VNode | string | (() => unknown))[];

        return { type: tag as HTMLTagName, props, children: normalizedChildren };
      };

      target[tag] = factory;
      return factory;
    },
  }
) as HTMLElementProxy;