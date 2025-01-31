import { DynamicValue } from "../global/types";
import { Signal } from "../reactive/types";
import { ClassValue, StyleValue } from "../css/types";

export type HTMLTagName = keyof HTMLElementTagNameMap;

// Element Types
export type Component = () => HNode | HTMLElement;
export type ComponentRegistryItem = {
  nodeEffects: Set<() => void>;
  propEffects: Set<() => void>;
  eventTypes: Set<string>;
  events: Map<HTMLElement, Map<string, (event: Event) => void>>;
  rootListeners: Set<(event: Event) => void>;
};
export type ComponentRegistry = Map<string, ComponentRegistryItem>;

export interface HNode {
  type: string | ((props: any) => HNode);
  props: HProps;
  children: HNodeChildren;
}

export type HProps = Partial<Record<keyof HellaElement, any>>;

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
  [K in keyof HTMLElementEventMap as `on${Lowercase<K>}`]?: (
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
  $element?: HTMLElement;
  tag: T;
  mount?: string;
  root?: string;
  id?: string | (() => string);
  class?: ClassValue | (() => ClassValue);
  data?: Record<string, DynamicValue<string>>;
  css?: StyleValue | (() => StyleValue);
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

//Props
export type PropValue = any;
export type PropHandler = (
  element: HTMLElement,
  key: string,
  value: PropValue,
  root: string
) => void;

// Render

export type RenderResult = HTMLElement | void;
export type RenderableNode = HNode | Component;
