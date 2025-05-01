import { HTMLAttributeMap, HTMLAttributes } from "./attributes";

export interface VNode<T extends HTMLTagName = HTMLTagName> {
  type?: T;
  props: VNodeProps<T>;
  children: VNodeValue[];
  __item?: any;
}

export type VNodeProps<T extends HTMLTagName = HTMLTagName> = HTMLAttributes<T> & {
  key?: string | number;
};

export type VNodePrimative<T = unknown> = string | number | boolean | (() => T);

export type VNodeValue = VNode | VNodePrimative;

export type HTMLTagName = keyof HTMLAttributeMap;

export type HTMLElementProxy = {
  [K in keyof HTMLAttributeMap]: {
    (
      props: VNodeProps<K>,
      ...children: VNodeValue[]
    ): VNode<K>;
    (...children: VNodeValue[]): VNode<K>;
  };
};


export type HTMLElementFactory<T extends HTMLTagName = HTMLTagName> = {
  (props: VNodeProps<T>, ...children: VNodeValue[]): VNode<T>;
  (...children: VNodeValue[]): VNode<T>;
};


export interface HTMLTagCache {
  [tagName: string]: HTMLElementFactory;
}

export interface ListItem {
  node: Node;
  effectCleanup?: () => void;
}