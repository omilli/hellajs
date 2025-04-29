import type { VNode, VNodeProps, VNodeValue } from "./dom";
import { type HTMLAttributeMap, type HTMLAttributes } from "./types/attributes";

/**
 * Represents valid HTML tag names.
 */
export type HTMLTagName = keyof HTMLAttributeMap;

/**
 * Type representing a proxy object for creating HTML element VNodes.
 */
export type HTMLElementProxy = {
  [K in keyof HTMLAttributeMap]: {
    (
      props: VNodeProps<K>,
      ...children: VNodeValue[]
    ): VNode<K>;
    (...children: VNodeValue[]): VNode<K>;
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
export interface HTMLTagCache {
  [tagName: string]: HTMLElementFactory;
}

/**
 * Proxy object for creating HTML element VNodes with element-specific props.
 */
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
        // Check if the first argument is props or a child
        const hasProps = propsOrChild !== null &&
          typeof propsOrChild === 'object' &&
          !Array.isArray(propsOrChild) &&
          !(propsOrChild instanceof Function) &&
          !('type' in propsOrChild && 'props' in propsOrChild && 'children' in propsOrChild);

        // Set props and children accordingly
        const props = hasProps ? (propsOrChild as VNodeProps) : {};
        const childArgs = hasProps ? children : [propsOrChild, ...children];

        // Normalize children, filtering out nulls and undefineds
        const normalizedChildren = childArgs
          .flat(Infinity)
          .filter(child => child !== undefined && child !== null)
          .map(child => (
            typeof child === 'string' || typeof child === 'number'
              ? String(child)
              : child
          )) as (VNode | string | (() => unknown))[];

        return {
          type: tag as HTMLTagName,
          props,
          children: normalizedChildren
        };
      };

      target[tag] = factory;
      return factory;
    },
  }
) as HTMLElementProxy;