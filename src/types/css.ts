interface PseudoSelectors {
  ":active"?: StyleValue;
  ":any-link"?: StyleValue;
  ":blank"?: StyleValue;
  ":checked"?: StyleValue;
  ":current"?: StyleValue;
  ":default"?: StyleValue;
  ":defined"?: StyleValue;
  ":dir"?: StyleValue;
  ":disabled"?: StyleValue;
  ":empty"?: StyleValue;
  ":enabled"?: StyleValue;
  ":first"?: StyleValue;
  ":first-child"?: StyleValue;
  ":first-of-type"?: StyleValue;
  ":fullscreen"?: StyleValue;
  ":future"?: StyleValue;
  ":focus"?: StyleValue;
  ":focus-visible"?: StyleValue;
  ":focus-within"?: StyleValue;
  ":has"?: StyleValue;
  ":host"?: StyleValue;
  ":hover"?: StyleValue;
  ":indeterminate"?: StyleValue;
  ":in-range"?: StyleValue;
  ":invalid"?: StyleValue;
  ":is"?: StyleValue;
  ":lang"?: StyleValue;
  ":last-child"?: StyleValue;
  ":last-of-type"?: StyleValue;
  ":left"?: StyleValue;
  ":link"?: StyleValue;
  ":local-link"?: StyleValue;
  ":nth-child"?: StyleValue;
  ":nth-last-child"?: StyleValue;
  ":nth-last-of-type"?: StyleValue;
  ":nth-of-type"?: StyleValue;
  ":only-child"?: StyleValue;
  ":only-of-type"?: StyleValue;
  ":optional"?: StyleValue;
  ":out-of-range"?: StyleValue;
  ":past"?: StyleValue;
  ":picture-in-picture"?: StyleValue;
  ":placeholder-shown"?: StyleValue;
  ":paused"?: StyleValue;
  ":playing"?: StyleValue;
  ":read-only"?: StyleValue;
  ":read-write"?: StyleValue;
  ":required"?: StyleValue;
  ":right"?: StyleValue;
  ":root"?: StyleValue;
  ":scope"?: StyleValue;
  ":target"?: StyleValue;
  ":valid"?: StyleValue;
  ":visited"?: StyleValue;
  "::after"?: StyleValue;
  "::before"?: StyleValue;
  "::cue"?: StyleValue;
  "::first-letter"?: StyleValue;
  "::first-line"?: StyleValue;
  "::grammar-error"?: StyleValue;
  "::marker"?: StyleValue;
  "::part"?: StyleValue;
  "::placeholder"?: StyleValue;
  "::selection"?: StyleValue;
  "::slotted"?: StyleValue;
  "::spelling-error"?: StyleValue;
}

interface AtRules {
  "@charset"?: string;
  "@color-profile"?: StyleValue;
  "@container"?: {
    [key: string]: StyleValue;
  };
  "@counter-style"?: StyleValue;
  "@font-face"?: StyleValue;
  "@font-feature-values"?: StyleValue;
  "@font-palette-values"?: StyleValue;
  "@import"?: string;
  "@keyframes"?: {
    [key: string]: StyleValue;
  };
  "@layer"?: {
    [key: string]: StyleValue;
  };
  "@media"?: {
    [key: string]: StyleValue;
  };
  "@namespace"?: string;
  "@page"?: StyleValue;
  "@position-try"?: StyleValue;
  "@property"?: {
    [key: string]: {
      syntax?: string;
      inherits?: boolean;
      initialValue?: string;
    };
  };
  "@scope"?: StyleValue;
  "@starting-style"?: StyleValue;
  "@supports"?: {
    [key: string]: StyleValue;
  };
  "@view-transition"?: StyleValue;
}

export type BaseStyleValue =
  | string
  | number
  | (() => string | number)
  | StyleValue;

export type StyleValue = {
  [K in
    | keyof CSSStyleDeclaration
    | keyof HTMLElementTagNameMap
    | `@${string}`]?: BaseStyleValue | boolean;
} & PseudoSelectors &
  AtRules & {
    [key: string]: BaseStyleValue | boolean | undefined;
  };

export type StyleValueWithConfig = StyleValue & { _styleConfig?: StyleConfig };

export type StyleScope = "scoped" | "inline" | "global" | undefined;

export type StyleSizeTo = "px" | "em" | "rem" | "vh" | "vw" | "vmin" | "vmax";

export type ClassValue = string | Record<string, boolean | (() => boolean)>;

export interface StyleConfig {
  scope?: StyleScope;
  sizeTo?: StyleSizeTo;
}

export type StyleProcessor = {
  processNestedStyles: (
    parentSelector: string,
    styles: Record<string, any>
  ) => [string[], string[]];
  processAtRule: (rule: string, value: any, parentSelector: string) => string;
  processInlineStyles: (styles: Record<string, any>) => Record<string, string>;
};
