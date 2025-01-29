import { DynamicValue } from "./global";
import { Signal } from "./reactive";
import { ClassValue, StyleValue } from "./css";

export type HTMLTagName = keyof HTMLElementTagNameMap;

// Element Types
export type Component = () => HNode | HTMLElement;

export interface HNode {
  type: string | ((props: any) => HNode);
  props: HProps;
  children: HNodeChildren;
}

export type HProps = Record<keyof HellaElement, any>;

export type HNodeChild =
  | HNode
  | string
  | number
  | null
  | undefined
  | Signal<any>;

export type HNodeChildren =
  | HNodeChild
  | (() => HNodeChild | HNodeChild[])
  | HNodeChild[];

export type HPropsOrChildren = HProps | HNodeChildren;

// Event Handling
export type EventHandler = (event: Event) => void;
export type EventHandlerMap = Record<string, EventHandler>;
export type EventHandlerProps = {
  [K in keyof HTMLElementEventMap as `on${K}`]?: (
    event: HTMLElementEventMap[K]
  ) => void;
};

// Element Properties and Configuration
export type AttributeValue =
  | string
  | number
  | boolean
  | (() => string | number | boolean);

export interface ElementLifecycle {
  onMount?: () => void | (() => void);
  onDestroy?: () => void;
  onUpdate?: () => void;
}

export interface HellaElement<T extends HTMLTagName = HTMLTagName>
  extends EventHandlerProps {
  $el?: HTMLElement;
  tag: T;
  key?: string | number;
  mount?: string;
  root?: string;
  id?: string | (() => string);
  class?: ClassValue | (() => ClassValue);
  data?: Record<string, DynamicValue<string>>;
  styles?: StyleValue | (() => StyleValue);
  onRender?: (element: HTMLElement) => void;
}

// Element Factory Types
export type ElementFunction<T extends HTMLTagName> = {
  (props?: ElementProps<T>, children?: HNodeChildren): HNode;
  (children: HNodeChildren): HNode;
};

export type ElementFactory = {
  [Tag in HTMLTagName]: ElementFunction<Tag>;
};

export type ElementProps<T extends HTMLTagName> = Partial<
  Omit<HellaElement<T>, keyof EventHandlerProps>
> &
  EventHandlerProps &
  HTMLElementProps<T>;

// HTML Element Props with Style Handling
export type HTMLElementProps<T extends HTMLTagName> = {
  [K in keyof HTMLElementTagNameMap[T]]?: K extends "style"
    ? StylePropType
    : HTMLElementTagNameMap[T][K] | (() => HTMLElementTagNameMap[T][K]);
};

type StylePropType =
  | string
  | CSSStyleDeclaration
  | (() => string | CSSStyleDeclaration)
  | (() => string);

// Mount
export type MountTarget = HTMLElement | string;

//Props
export type PropValue = any;
export type PropHandler = (
  el: HTMLElement,
  key: string,
  value: PropValue,
  root: string
) => void;

// Render

export type RenderResult = HTMLElement | void;
export type RenderableNode = HNode | Component;
