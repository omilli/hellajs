import type * as CSS from "csstype";

export interface CSSOptions {
  scoped?: boolean | string;
  name?: string;
  global?: boolean;
}

export type CSSValue = string | number | CSSObject | CSS.Properties;

export type DollarTagSelectors = {
  [K in keyof HTMLElementTagNameMap as `$${K & string}`]?: CSSValue;
};

export type PseudoSelectors = {
  [K in CSS.Pseudos]?: CSSValue | CSSObject;
};

export type CSSSelector =
  | keyof DollarTagSelectors
  | CSS.AtRules
  | CSS.Pseudos

export type CSSObject = {
  [key in CSSSelector]?: CSSValue;
} & {
  [K in keyof CSS.Properties]?: CSS.Properties[K] | string | number;
}