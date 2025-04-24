import type { Signal } from "./signal";

export type EventFn = (event: Event, element: HTMLElement) => void;

export type VNodeProps = {
  [key: string]:
  | string
  | number
  | boolean
  | object
  | EventFn
  | Signal<any>
  | (() => any);
};

export type VNodeType = string | ((props: any) => VNode);

export type VNodeChildren = Array<VNode | null | undefined>;

export type VNode =
  | string
  | number
  | boolean
  | null
  | undefined
  | {
    type: VNodeType;
    props?: VNodeProps;
    children?: VNodeChildren;
    key?: any;
  }
  | Signal<any>
  | (() => any);
