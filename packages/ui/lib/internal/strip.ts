import { transformSync } from "esbuild";

const STRIP_OPTIONS = { format: "esm", target: "esnext" } as const;

/**
 * Strips TypeScript syntax from registry source for `--lang js` delivery,
 * keyed by extension: `.tsx` compiles with `jsx: "preserve"` so the copied
 * `.jsx` keeps JSX for the user's own transpiler, `.ts` compiles to plain
 * JavaScript (the runtime `html` template survives), and any other extension
 * (`tokens.js`, `theme.css`) returns verbatim. Shared options never downlevel
 * modern syntax; esbuild's output formatting may churn across minors, so
 * consumers assert structural invariants, never byte-golden text.
 * @param source Registry file text.
 * @param file Registry file name, keyed by extension.
 * @returns Plain-JavaScript source text.
 * @internal
 */
export function stripTypes(source: string, file: string): string {
  if (file.endsWith(".tsx")) {
    return transformSync(source, { ...STRIP_OPTIONS, loader: "tsx", jsx: "preserve" }).code;
  }
  if (file.endsWith(".ts")) {
    return transformSync(source, { ...STRIP_OPTIONS, loader: "ts" }).code;
  }
  return source;
}
