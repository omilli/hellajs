import babel from "@babel/core";
import babelHellaJS from "../index.mjs";

export function transformJSX(code: string): string {
  const result = babel.transformSync(code, {
    plugins: [[babelHellaJS]],
    configFile: false
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
    const names = match[1]!.split(",").map(s => s.trim());
    imports.push(...names);
  }
  return imports;
}
