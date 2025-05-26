import type { HTMLAttributeMap, HTMLTagName, VNode, VNodeProps, VNodeValue } from "../types";

/**
 * Represents a factory function for creating DOM fragments.
 */
type FragmentFactory = {
  (props: VNodeProps, ...children: VNodeValue[]): VNode;
  (...children: VNodeValue[]): VNode;
};

/**
 * Represents a factory function for creating HTML elements (VNodes).
 */
type HTMLElementFactory<T extends HTMLTagName = HTMLTagName> = {
  (props: VNodeProps<T>, ...children: VNodeValue[]): VNode<T>;
  (...children: VNodeValue[]): VNode<T>;
};

/**
 * Represents a proxy for creating HTML elements (VNodes) with dynamic tag names.
 */
type HTMLElementProxy = {
  [K in keyof HTMLAttributeMap]: HTMLElementFactory<K>;
} & {
  $: FragmentFactory;
};

/**
 * Represents a cache for storing factories of HTML elements (VNodes).
 */
interface HTMLTagCache {
  [tagName: string]: HTMLElementFactory | FragmentFactory;
  $: FragmentFactory;
}

/**
 * Extracts the props and children arguments for a node (VNode) from the provided parameters.
 *
 * Determines whether the first argument is a props object or a child value, and returns a tuple
 * containing the props object and an array of child values.
 *
 * @param propsOrChild - Either a props object for the VNode or the first child value.
 * @param children - An array of additional child values.
 * @returns A tuple where the first element is the props object (or an empty object if none was provided),
 *          and the second element is an array of child values.
 */
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

/**
 * A proxy-based factory for creating HTML elements (VNodes).
 *
 * The `html` object allows you to dynamically generate VNode factories for any HTML tag.
 * Accessing a property on `html` (e.g., `html.div`, `html.span`) returns a function that
 * creates a VNode for that tag. The special `$` property can be used to create a VNode
 * with a custom tag name.
 *
 * Example usage:
 * ```ts
 * const vnode = html.div({ class: "container" }, "Hello, world!");
 * ```
 *
 * @remarks
 * This proxy caches factories for each tag name to avoid recreating them.
 *
 * @typeParam HTMLElementProxy - The type representing the proxy interface for HTML elements.
 */
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