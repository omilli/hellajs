import fsStat from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { execCommand, projectRoot } from "../utils/index.js";

/**
 * Apply terser optimization to a built JS file with source map support.
 * @param filePath Path to the JS file to optimize (overwrites in-place)
 * @param shouldMangle Whether to enable name mangling
 */
export async function applyTerser(
  filePath: string,
  shouldMangle: boolean,
): Promise<void> {
  const fileName = path.basename(filePath);
  const mapFileName = `${fileName}.map`;
  const inputMapPath = `${filePath}.map`;
  const outputMapPath = inputMapPath;

  let sourceMapOption = `url='${mapFileName}',filename='${fileName}'`;
  if (fsStat.existsSync(inputMapPath)) {
    sourceMapOption = `content='${inputMapPath}',url='${mapFileName}',filename='${fileName}'`;
  }

  const terserArgs = [
    filePath,
    "-o",
    filePath,
    "--source-map",
    sourceMapOption,
    "--compress",
    "inline=3,reduce_funcs=true,reduce_vars=true,passes=3,side_effects=false,unsafe=true",
  ];

  if (shouldMangle) {
    terserArgs.push("--mangle");
  }

  await execCommand("bunx", ["terser", ...terserArgs], { cwd: projectRoot });

  if (fsStat.existsSync(outputMapPath)) {
    const sourceMap = JSON.parse(
      await fs.readFile(outputMapPath, "utf8"),
    );
    sourceMap.file = fileName;
    await fs.writeFile(outputMapPath, JSON.stringify(sourceMap));
  }
}

/**
 * Rewrite .js import paths in a minified file to .min.js (4 regex passes).
 * @param filePath Path to the minified JS file to update in-place
 */
export async function fixMinifiedImports(filePath: string): Promise<void> {
  let content = await fs.readFile(filePath, "utf8");

  content = content.replace(
    /from\s*["'](\.\.?\/[^"']+)["']/g,
    (match, importPath: string) => {
      if (
        importPath.endsWith(".js") ||
        importPath.endsWith(".min.js") ||
        importPath.endsWith(".json")
      ) {
        return match;
      }
      return match.replace(importPath, `${importPath}.min.js`);
    },
  );

  content = content.replace(
    /from\s*["']([^"']*\.js)["']/g,
    (match, importPath: string) => {
      if (importPath.endsWith(".min.js")) return match;
      return match.replace(importPath, importPath.replace(".js", ".min.js"));
    },
  );

  content = content.replace(
    /import\s*\(\s*["'](\.\.?\/[^"']+)["']\s*\)/g,
    (match, importPath: string) => {
      if (
        importPath.endsWith(".js") ||
        importPath.endsWith(".min.js") ||
        importPath.endsWith(".json")
      ) {
        return match;
      }
      return match.replace(importPath, `${importPath}.min.js`);
    },
  );

  content = content.replace(
    /import\s*\(\s*["']([^"']*\.js)["']\s*\)/g,
    (match, importPath: string) => {
      if (importPath.endsWith(".min.js")) return match;
      return match.replace(importPath, importPath.replace(".js", ".min.js"));
    },
  );

  await fs.writeFile(filePath, content, "utf8");
}
