import type * as CSS from "csstype";

/**
 * Options for the `css` function.
 */
export interface CSSOptions {
  /** A CSS selector to scope the CSS rules to. Can be any valid CSS selector (class, ID, attribute, pseudo, etc.). */
  scoped?: string;
  /** A specific class name to use. */
  name?: string;
  /** If `true`, the styles will be applied globally. */
  global?: boolean;
}

/**
 * Represents a value for a CSS property.
 * It can be a simple string or number, or a nested CSS object for more complex rules.
 */
export type CSSValue = string | number | CSSObject | CSS.Properties;

/**
 * Defines a type for CSS pseudo-selectors.
 */
export type PseudoSelectors = {
  [K in CSS.Pseudos]?: CSSValue | CSSObject;
};

/**
 * Represents a CSS selector, which can be an HTML tag, a pseudo-selector, an at-rule, or a custom string.
 */
export type CSSSelector =
  | keyof HTMLElementTagNameMap
  | CSS.AtRules
  | CSS.Pseudos
  | (string & {});

/**
 * A CSS object is a JavaScript object that represents CSS rules.
 * Keys are CSS selectors, and values are CSS properties or nested CSS objects.
 */
export type CSSObject = {
  [key in CSSSelector]?: CSSValue;
} & {
  [K in keyof CSS.Properties]?: CSS.Properties[K] | string | number;
};