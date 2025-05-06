import type { HTMLAttributeMap, HTMLAttributes } from "./attributes";

export type HTMLTagName = keyof HTMLAttributeMap;

export interface VNode<T extends HTMLTagName = HTMLTagName> {
  tag?: T;
  props: VNodeProps<T>;
  children: VNodeValue[];
  _item?: unknown;
}

export type VNodeProps<T extends HTMLTagName = HTMLTagName> = HTMLAttributes<T> & {
  key?: string | number;
};

export type VNodePrimative<T = unknown> = string | number | boolean | (() => T);

export type VNodeValue = VNode | VNodePrimative;