import { DynamicValue } from "../global/global.types";
import { Signal } from "../reactive/reactive.types";

export type HTMLTagName = keyof HTMLElementTagNameMap;

// Element Types
export type ComponentRegistryItem = {
  eventNames: Set<string>;
  events: Map<HTMLElement, Map<string, (event: Event) => void>>;
  rootListeners: Set<(event: Event) => void>;
};
export type ComponentRegistry = Map<string, ComponentRegistryItem>;

export type HProps = Partial<Record<keyof HellaElement, any>>;

export type HNodeChild =
  | HellaElement
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

// Event handler argument types
export type EventHandlerArgs = {
  domElement: HTMLElement;
  eventName: string;
  handler: EventHandler;
  rootSelector: string;
};

export type DelegatedEventArgs = {
  component: ComponentRegistryItem;
  eventName: string;
  rootSelector: string;
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

export type ClassDefinition = {
  [key: string]: boolean | (() => boolean);
};

export type ClassValue =
  | string
  | ClassDefinition
  | Array<string | undefined | null>
  | (() => ClassValue);

export type HellaElement<T extends HTMLTagName = HTMLTagName> =
  EventHandlerProps &
    HTMLElementProps<T> & {
      tag: T;
      root?: string;
      classes?: ClassValue | (() => ClassValue);
      data?: Record<string, DynamicValue<string | number | boolean>>;
      content?: HNodeChildren;
      onRender?: (element: HTMLElement) => void;
      onPreRender?: () => void;
    };

// Element Factory Types
export type ElementFunction<T extends HTMLTagName> = {
  (props?: ElementProps<T>, content?: HNodeChildren): HellaElement;
  (content: HNodeChildren): HellaElement;
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
export type CleanupFunction = () => void;

// Node argument types
export type DiffNodesArgs = {
  parent: HTMLElement | DocumentFragment;
  currentNode: Node;
  newNode: Node;
  rootSelector: string;
};

export type ProcessChildArgs = {
  child: HNodeChild | (() => HNodeChild | HNodeChild[]);
  domElement: HTMLElement | DocumentFragment;
  rootSelector: string;
};

export type BatchUpdateArgs = {
  current: Element;
  next: Element;
};

export type UpdateNodeArgs = {
  parent: DocumentFragment;
  current?: Node;
  next?: Node;
  rootSelector: string;
};

export type NodeTypes = {
  isElement: boolean;
  isText: boolean;
};
