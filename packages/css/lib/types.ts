import type * as CSS from "csstype";

export interface CSSOptions {
  scoped?: string;
  name?: string;
  global?: boolean;
}

// Reactive CSS value can be a function that returns a value
export type ReactiveCSSValue<T = any> = T | (() => T);

export type CSSValue = 
  | string 
  | number 
  | CSSObject 
  | CSS.Properties
  | ReactiveCSSValue<string | number>;

export type PseudoSelectors = {
  [K in CSS.Pseudos]?: CSSValue | CSSObject;
};

export type CSSSelector =
  | keyof HTMLElementTagNameMap
  | CSS.AtRules
  | CSS.Pseudos
  | (string & {});

export type CSSObject = {
  [key in CSSSelector]?: CSSValue;
} & {
  [K in keyof CSS.Properties]?: 
    | CSS.Properties[K] 
    | string 
    | number
    | ReactiveCSSValue<CSS.Properties[K] | string | number>;
};

// Internal types for managing reactive CSS
export interface ReactiveStyleData {
  cleanup: () => void;
  element?: HTMLStyleElement;
}