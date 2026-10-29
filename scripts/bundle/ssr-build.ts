import fsStat from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { ensureDir, execCommand, projectRoot } from "../utils/index.ts";
import { transformRegistrySource } from "./registry.ts";

/** The esbuild binary from the local npm tree (PM-agnostic spawn target). */
const esbuildBin = path.join(projectRoot, "node_modules/.bin/esbuild");

/**
 * Append `.js` extensions to relative imports in transpiled per-module output
 * (esbuild preserves extensionless specifiers; Node ESM rejects them).
 * @param content Transpiled module text.
 * @param modulePath Original source path — extensionless specifiers resolve against it.
 * @returns Module text with resolved relative specifiers.
 */
export function fixRelativeImports(content: string, modulePath: string): string {
  const resolveSpecifier = (importPath: string): string => {
    const sourceDir = path.dirname(modulePath);
    const sourcePath = path.resolve(sourceDir, importPath);
    const sourceIndexPath = path.join(sourcePath, "index.ts");

    if (fsStat.existsSync(sourceIndexPath)) {
      return `${importPath}/index.js`;
    }
    return `${importPath}.js`;
  };

  let fixed = content.replace(
    /(?:from|import)\s+["'](\.\.?\/[^"']+)["']/g,
    (match, importPath: string) => {
      if (importPath.endsWith(".js") || importPath.endsWith(".json")) return match;
      return match.replace(importPath, resolveSpecifier(importPath));
    },
  );

  fixed = fixed.replace(
    /import\s*\(\s*["'](\.\.?\/[^"']+)["']\s*\)/g,
    (match, importPath: string) => {
      if (importPath.endsWith(".js") || importPath.endsWith(".json")) return match;
      return match.replace(importPath, resolveSpecifier(importPath));
    },
  );

  return fixed;
}

/**
 * Emit the ast-target per-module variant for packages with `.tsx` lib sources
 * (`dist/ssr/**`, including `index.js`): JSX compiles to HellaNode literals
 * (the `@hellajs/ssr` walker's currency) so server arms can import the
 * package without touching dom's renderer. Plain `.ts` modules transpile
 * verbatim. Regular variant only — server builds do not consume per-module
 * min, and the variant mirrors `dist/**` in shape, so no metrics of its own.
 * @param packageInfo Package metadata (source, dist, and cache dirs).
 * @param sourceModules Every lib source module, so relative imports resolve.
 * @param cwd Working directory for the esbuild process.
 */
export async function buildSsrModules(
  packageInfo: { dir: string; distDir: string; cacheDir: string },
  sourceModules: string[],
  cwd: string,
): Promise<void> {
  if (!sourceModules.some((modulePath) => modulePath.endsWith(".tsx"))) return;

  const { dir, distDir, cacheDir } = packageInfo;
  const libDir = path.join(dir, "lib");
  const ssrDir = path.join(distDir, "ssr");

  for (const modulePath of sourceModules) {
    const relativePath = path.relative(libDir, modulePath);
    const extension = path.extname(modulePath);
    const moduleName = relativePath.replace(/\.tsx?$/, "").replace(/\\/g, "/");
    const moduleDir = path.dirname(relativePath);
    const baseName = path.basename(relativePath, extension);
    const outputDir = moduleDir === "." ? ssrDir : path.join(ssrDir, moduleDir);

    await ensureDir(outputDir);

    let esbuildInput = modulePath;
    if (extension === ".tsx") {
      const source = await fs.readFile(modulePath, "utf8");
      esbuildInput = path.join(cacheDir, "ssr-modules", `${moduleName}.js`);
      await ensureDir(path.dirname(esbuildInput));
      await fs.writeFile(
        esbuildInput,
        transformRegistrySource(source, path.basename(modulePath), "ast"),
      );
    }

    const outputPath = path.join(outputDir, `${baseName}.js`);
    await execCommand(
      esbuildBin,
      [
        esbuildInput,
        `--outfile=${outputPath}`,
        "--format=esm",
        "--target=es2020",
        "--platform=browser",
      ],
      { cwd },
    );

    if (fsStat.existsSync(outputPath)) {
      let content = await fs.readFile(outputPath, "utf8");
      content = fixRelativeImports(content, modulePath);
      await fs.writeFile(outputPath, content, "utf8");
    }
  }
}
