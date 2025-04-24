import type { VNode, VNodeProps, VNodeValue } from "./dom";

/**
 * Represents valid HTML tag names.
 */
export type HTMLTagName = keyof HTMLElementTagNameMap;

export type HTMLFragmentProxy = {
  $: (...children: VNodeValue[]) => VNode;
};

/**
 * Type representing a proxy object for creating HTML element VNodes.
 */
export type HTMLElementProxy = {
  [K in HTMLTagName]: {
    (props?: VNodeProps<K>, ...children: VNodeValue[]): VNode<K>;
    (...children: VNodeValue[]): VNode<K>;
  };
} & HTMLFragmentProxy;

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
export type HTMLTagCache = {
  [tagName: string]: HTMLElementFactory | ((...children: VNodeValue[]) => VNode);
} & HTMLFragmentProxy;
