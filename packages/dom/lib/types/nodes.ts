import type { HTMLAttributeMap, HTMLAttributes } from "./attributes";

export type HTMLTagName = keyof HTMLAttributeMap;

export interface VNode<T extends HTMLTagName = HTMLTagName> {
  tag?: T;
  props?: VNodeProps<T>;
  children?: VNodeValue[];
}

export interface ElementLifecycle {
  onDestroy?: (() => void);
  onUpdate?: (() => void);
}

export type VNodeProps<T extends HTMLTagName = HTMLTagName> = HTMLAttributes<T> & ElementLifecycle;

export type HellaElement = Element & {
  hellaEffects?: Set<() => void>;
  hellaEvents?: Map<string, EventListener>;
} & ElementLifecycle;

export type VNodePrimative<T = unknown> = string | number | boolean | ((...args: unknown[]) => T);

export type VNodeValue = VNode | VNodePrimative | Node | unknown;

export type ForEach<T> = (item: T, index: number) => VNodeValue;