export interface VitePlugin {
  name: string;
  enforce: "pre";
  transform(
    code: string,
    id: string,
    transformOptions?: { ssr?: boolean },
  ): Promise<{ code: string; map?: unknown } | null>;
}

export interface ViteHellaJSOptions {
  /** Emission target: "ast" (default) emits HellaNode objects; "dom" emits imperative `@hellajs/dom/runtime` construction. Wrapper-owned build config, not per-file user config. */
  target?: "ast" | "dom";
}

export default function viteHellaJS(options?: ViteHellaJSOptions): VitePlugin;
