import type * as CSS from "csstype";

/**
 * Options for the `css` function
 */
export interface CSSOptions {
  /** A class name to scope styles to. When provided, creates `.{name}` selector and returns the name for use in `class` attributes. */
  name?: string;
}

/**
 * Represents a value for a CSS property.
 * Can be a simple string or number, or a nested CSS object for more complex rules.
 */
export type CSSValue = string | number | (string | number)[] | CSSObject;

/**
 * Represents a CSS selector: HTML tag, pseudo-selector, at-rule, or custom string
 */
export type CSSSelector =
  | keyof HTMLElementTagNameMap
  | CSS.AtRules
  | CSS.Pseudos
  | (string & {});

/**
 * A CSS object: keys are CSS selectors, values are CSS properties or nested CSS objects
 */
export type CSSObject = {
  [key in CSSSelector]?: CSSValue;
} & {
  [K in keyof CSS.Properties]?: CSS.Properties[K] | (string | number)[] | string | number;
};
/**
 * Transforms an object type to CSS variable proxy where all leaf values become var() strings
 */
export type CSSVars<T> = {
  [K in keyof T]: T[K] extends Record<string, unknown> ? CSSVars<T[K]> : string;
};

/**
 * Options for the `cssVars` function
 */
export interface CSSVarsOptions {
  /** A CSS selector to scope the CSS variables to. Can be any valid CSS selector (class, ID, attribute, etc.). */
  scoped?: string;
  /** A prefix to add to all CSS variable names. */
  prefix?: string;
}
