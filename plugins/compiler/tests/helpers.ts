import { transform } from "../index.mjs";
import type { TransformOptions, TransformResult } from "../index.d.ts";

/**
 * Transform JSX source through the engine with optional overrides. Defaults
 * compile an explicit ast-target jsx fixture — corpus tests always pass
 * `target` explicitly (the engine's real default is "dom" and is pinned by its
 * own dedicated test, never relied on silently).
 * @param code JSX source
 * @param options Transform option overrides (`filename`, `lang`, `target`)
 * @returns The transform result; throws on a JSX-free fixture (a corpus bug)
 */
export function transformJSX(code: string, options?: Partial<TransformOptions>): TransformResult {
  const result = transform(code, { filename: "fixture.jsx", target: "ast", ...options });
  if (!result) throw new Error("corpus inputs always contain JSX — the transform returned null");
  return result;
}

/**
 * Collapse whitespace for full-output equality asserts (printer formatting
 * freedom: the engine's astring layout is its own; only structure is asserted).
 * @param output Transformed code
 * @returns Normalized one-line form
 */
export function normalize(output: string): string {
  return output.replace(/\s+/g, " ").trim();
}

/**
 * Transform (raw code) or pass through (already-transformed output) and
 * regex-extract the named specifiers of the import from `source`. JSX-free
 * input transforms to null and extracts from the code verbatim.
 * @param code JSX source or emitted output
 * @param source Module specifier to extract specifiers for
 * @param options Transform option overrides (only relevant for raw code)
 * @returns Specifier source texts (`"component"`, `"template as _hellaTemplate"`, ...)
 */
export function getNamedImports(
  code: string,
  source: string,
  options?: Partial<TransformOptions>,
): string[] {
  const result = transform(code, { filename: "fixture.jsx", target: "ast", ...options });
  const output = result === null ? code : result.code;
  const match = new RegExp(`import\\s*{([^}]+)}\\s*from\\s*['"]${source}['"]`).exec(output);
  return match ? match[1]!.split(",").map((s) => s.trim()) : [];
}
