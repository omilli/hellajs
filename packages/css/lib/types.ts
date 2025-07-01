import type * as CSS from "csstype";

export interface CSSOptions {
  scoped?: string;
  name?: string;
  global?: boolean;
}

export type CSSValue = string | number | CSSObject | CSS.Properties;

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
  [K in keyof CSS.Properties]?: CSS.Properties[K] | string | number;
};