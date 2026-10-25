import type { PluginObj } from "@babel/core";

export interface BabelHellaJSOptions {
  /** Emission target: "ast" (default) emits HellaNode objects; "dom" emits imperative `@hellajs/dom/runtime` construction. Wrapper-owned build config, not per-file user config. */
  target?: "ast" | "dom";
}

export default function babelHellaJS(babel: object, options?: BabelHellaJSOptions): PluginObj;
