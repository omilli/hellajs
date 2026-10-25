import babel from "@babel/core";
import babelHellaJS from "../index.mjs";

/**
 * Transform JSX source through the plugin with optional plugin options
 * (`{ target: "dom" }` for the imperative builder).
 * @param code JSX source
 * @param options Plugin options forwarded to `babelHellaJS`
 * @returns Transformed code
 */
export function transformJSX(code: string, options?: Record<string, unknown>): string {
  const result = babel.transformSync(code, {
    plugins: options ? [[babelHellaJS, options]] : [[babelHellaJS]],
    configFile: false,
  });
  return result?.code || "";
}

export function normalize(output: string): string {
  return output.replace(/\s+/g, " ").trim();
}

export function getNamedImports(code: string, source: string): string[] {
  const output = transformJSX(code);
  const imports: string[] = [];
  const importRegex = new RegExp(`import\\s*{([^}]+)}\\s*from\\s*['"]${source}['"]`, "g");
  const match = importRegex.exec(output);
  if (match) {
    const names = match[1]!.split(",").map((s) => s.trim());
    imports.push(...names);
  }
  return imports;
}
