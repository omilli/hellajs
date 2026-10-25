export interface RollupPlugin {
  name: string;
  enforce: "pre";
  resolveId(source: string, importer?: string): Promise<string | null> | null;
  load(id: string): { code: string; map?: unknown } | null;
  transform(code: string, id: string): { code: string; map?: unknown } | null;
}

export interface RollupHellaJSOptions {
  /** Emission target: "ast" (default) emits HellaNode objects; "dom" emits imperative `@hellajs/dom/runtime` construction. Wrapper-owned build config, not per-file user config. */
  target?: "ast" | "dom";
}

export default function rollupHellaJS(options?: RollupHellaJSOptions): RollupPlugin;
