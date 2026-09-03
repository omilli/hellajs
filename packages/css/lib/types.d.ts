import type * as CSS from "csstype";

/**
 * Options for the `css` function
 */
export interface CSSOptions {
  /** Node the `<style>` element is created in — e.g. a `ShadowRoot` for web components. Defaults to `document.head`. */
  host?: ParentNode;
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
 * Options for the `style` function
 */
export interface StyleOptions {
  /** Label embedded in the generated class name (`h-{label}-{hash}`). Sanitized to [a-zA-Z0-9-]; a label empty after sanitization is treated as absent. */
  label?: string;
  /** Node the `<style>` element is created in — e.g. a `ShadowRoot` for web components. Defaults to `document.head`. */
  host?: ParentNode;
}

/**
 * A declarations-first style object: CSS property keys with style values,
 * plus nested selector / `&` / at-rule keys holding nested style objects.
 * Scoped under a generated class by `style()`.
 */
export type StyleObject = {
  [K in keyof CSS.Properties]?: CSS.Properties[K] | (string | number)[] | string | number;
} & {
  [key in CSSSelector]?: CSSValue;
};

/**
 * Variant map for a `cva` config: each variant key holds value names mapped
 * to their style object or a verbatim class string.
 */
export type CVAVariants = Record<string, Record<string, StyleObject | string>>;

/**
 * Breakpoint map for a `cva` config: breakpoint name → media condition,
 * interpolated verbatim (e.g. `{ md: '(min-width: 768px)' }`).
 */
export type CVAMedia = Record<string, string>;

/**
 * A single variant selection: a scalar value name, or a responsive object —
 * `initial` is the un-wrapped base, breakpoint keys select under their
 * media conditions.
 */
export type CVAPropValue<VK extends Record<string, StyleObject | string>, M extends CVAMedia> =
  (keyof VK & string)
  | ({ initial?: keyof VK & string } & { [B in keyof M]?: keyof VK & string });

/**
 * Props accepted by a `cva` recipe: one optional selection per variant.
 */
export type CVAProps<V extends CVAVariants, M extends CVAMedia> = {
  [K in keyof V]?: CVAPropValue<V[K], M>;
};

/**
 * One compound variant entry: emits its `css` when every stated selection
 * equals the resolved one. Keys absent from the config's `variants` are
 * compile-time errors.
 */
export type CVAVariantMatch<V extends CVAVariants, M extends CVAMedia> = CVAProps<V, M> & {
  css: StyleObject | string;
};

/**
 * Config accepted by `cva`.
 */
export interface CVAConfig<V extends CVAVariants, M extends CVAMedia> {
  /** Style object hashed into the base class, or a class string passed through verbatim. */
  base?: StyleObject | string;
  /** Breakpoint map: name → media condition. Prop and compound selections key into it responsively. */
  media?: M;
  /** Variant map: variant key → value name → style object or class string. */
  variants: V;
  /** Selections applied when a prop omits the variant (the un-wrapped `initial` slot). */
  defaultVariants?: { [K in keyof V]?: keyof V[K] & string };
  /** Styles emitted when every stated selection matches the resolved props. */
  compoundVariants?: CVAVariantMatch<V, M>[];
}

/**
 * Accepted argument shapes for `cx`: strings and numbers contribute
 * themselves, falsy values drop, objects contribute their truthy-valued
 * keys, and arrays recurse.
 */
export type CXArg = string | number | false | null | undefined | Record<string, unknown> | CXArg[];
/**
 * A `@keyframes` definition: step keys (`from`, `to`, percentage stops)
 * mapped to style objects of declarations. Processed by `keyframes()` under
 * a content-hashed animation name.
 */
export type KeyframesObject = Record<string, StyleObject>;

/**
 * Accepted leaf value types for CSS custom properties.
 * Strings, numbers, and functions returning string or number (signals, computed, plain getters).
 */
export type CSSVarLeaf = string | number | ((...args: never[]) => string | number);

/**
 * A plain object whose leaf values are CSSVarLeaf, with optional nested CSSVarInputObject
 * for nested CSS variable definitions.
 */
export interface CSSVarInputObject {
  [key: string]: CSSVarLeaf | CSSVarInputObject;
}

/**
 * Transforms an object type to CSS variable proxy where all leaf values become var() strings
 */
export type CSSVars<T> = {
  [K in keyof T]: T[K] extends CSSVarInputObject ? CSSVars<T[K]> : string;
};

/**
 * Options for the `vars` function
 */
export interface VarsOptions {
  /** A CSS selector to scope the CSS variables to. Can be any valid CSS selector (class, ID, attribute, etc.). */
  scoped?: string;
  /** A prefix to add to all CSS variable names. */
  prefix?: string;
  /** A media condition to place the variables under, e.g. `(prefers-color-scheme: dark)`. Interpolated verbatim. */
  media?: string;
  /** Node the `<style>` element is created in — e.g. a `ShadowRoot` for web components. Defaults to `document.head`. */
  host?: ParentNode;
}


