export interface TransformOptions {
  filename: string;
  lang?: "js" | "jsx" | "ts" | "tsx";
  /** "dom" (default): imperative `@hellajs/dom/runtime` construction — the
   *  client currency. "ast": HellaNode emission — the ssr/server currency. */
  target?: "ast" | "dom";
}

export interface TransformResult {
  code: string;
  map: object | null;
}

/**
 * Transform JSX source into HellaJS runtime code.
 * @param code JSX source.
 * @param options `filename` is required; `target` defaults to `"dom"`.
 * @returns Transformed code plus the chained source map, or null when the input carries no JSX.
 * @throws {Error} When options is not an object, carries unknown keys, or target/lang is invalid.
 */
export function transform(code: string, options: TransformOptions): TransformResult | null;
