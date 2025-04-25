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
    (props?: VNodeProps<HTMLTagName>, ...children: VNodeValue[]): VNode<HTMLTagName>;
    (...children: VNodeValue[]): VNode<HTMLTagName>;
  };
}

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

