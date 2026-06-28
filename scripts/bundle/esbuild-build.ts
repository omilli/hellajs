import fsStat from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import {
  ensureDir,
  scanDirRecursive,
  logger,
  execCommand,
} from "../utils/index.js";
import { VARIANTS } from "./config.js";
import { applyTerser, fixMinifiedImports } from "./optimize.js";
import { calculateFileMetrics } from "./metrics.js";

/**
 * Build a JavaScript bundle with esbuild.
 * @param inputPath Entry file path
 * @param outputPath Output bundle path
 * @param externals External dependency flags (e.g. --external:@hellajs/core)
 * @param isMinified Whether to minify and emit sourcemaps
 * @param cwd Working directory for the esbuild process
 */
export async function buildWithEsbuild(
  inputPath: string,
  outputPath: string,
  externals: string[],
  isMinified: boolean,
  cwd: string,
): Promise<void> {
  const buildArgs = [
    "esbuild",
    inputPath,
    "--bundle",
    `--outfile=${outputPath}`,
    "--format=esm",
    "--target=es2020",
    "--platform=browser",
    "--out-extension:.js=.js",
    ...externals,
  ];

  if (isMinified) {
    buildArgs.push("--minify", "--sourcemap");
  }

  await execCommand("bunx", buildArgs, { cwd });
}

async function getAllSourceModules(packageDir: string): Promise<string[]> {
  const libDir = path.join(packageDir, "lib");
  if (!fsStat.existsSync(libDir)) return [];

  const files = await scanDirRecursive(libDir, /\.ts$/);
  return files.filter((file) => !file.endsWith(".d.ts"));
}

/**
 * Build the main package bundle from lib/index.ts.
 * Generates both regular and minified (.min) variants and fixes imports for minified output.
 * @returns Record keyed by variant suffix ("" or ".min") with size metrics
 */
export async function buildBundle(
  packageInfo: {
    dir: string;
    distDir: string;
    peerDeps: string[];
    name: string;
    fullName: string;
    version: string;
    entryPoint: string;
    tsconfigPath: string;
    cacheDir: string;
    packageJson: Record<string, unknown>;
  },
  cwd: string,
  bundleMode = "dev",
): Promise<Record<string, unknown>> {
  const { dir, distDir, peerDeps } = packageInfo;
  const externals = peerDeps.flatMap(
    (dep: string) => [`--external:${dep}`],
  );
  const variants: (typeof VARIANTS)[number][] =
    bundleMode === "size" ? [VARIANTS[1]!] : VARIANTS;
  const bundleMetrics: Record<string, unknown> = {};

  for (const variant of variants) {
    const bundlePath = path.join(distDir, `bundle${variant.suffix}.js`);
    const isMinified = variant.suffix === ".min";

    await buildWithEsbuild(
      path.join(dir, "lib/index.ts"),
      bundlePath,
      externals,
      isMinified,
      cwd,
    );

    if (fsStat.existsSync(bundlePath)) {
      let content = await fs.readFile(bundlePath, "utf8");

      if (isMinified) {
        content = content.replace(
          /from\s+["']([^"']*\.js)["']/g,
          (match, importPath: string) => {
            if (importPath.endsWith(".min.js")) return match;
            return match.replace(
              importPath,
              importPath.replace(".js", ".min.js"),
            );
          },
        );
        content = content.replace(
          /import\s*\(\s*["']([^"']*\.js)["']\s*\)/g,
          (match, importPath: string) => {
            if (importPath.endsWith(".min.js")) return match;
            return match.replace(
              importPath,
              importPath.replace(".js", ".min.js"),
            );
          },
        );
      }

      await fs.writeFile(bundlePath, content, "utf8");
    }

    if (variant.terser && fsStat.existsSync(bundlePath)) {
      try {
        await applyTerser(bundlePath, variant.terser.mangle);
        await fixMinifiedImports(bundlePath);
      } catch (terserError) {
        logger.warn(
          `Warning: Terser optimization failed for bundle${variant.suffix}: ${(terserError as Error).message}`,
        );
      }
    }

    if (fsStat.existsSync(bundlePath)) {
      const metrics = await calculateFileMetrics(bundlePath);
      bundleMetrics[variant.suffix || "regular"] = {
        ...metrics,
        path: bundlePath,
      };
    }
  }

  return bundleMetrics;
}

/**
 * Transpile each lib/ module individually, preserving directory structure.
 * Fixes import extensions (.js, /index.js) and rewrites to .min.js for minified variants.
 * @returns Metrics object keyed by module name with variant sizes
 */
export async function buildIndividualModules(
  packageInfo: {
    dir: string;
    distDir: string;
    entryPoint: string;
    tsconfigPath: string;
    cacheDir: string;
    peerDeps: string[];
    name: string;
    fullName: string;
    version: string;
    packageJson: Record<string, unknown>;
  },
  cwd: string,
): Promise<Record<string, unknown>> {
  const { dir, distDir } = packageInfo;
  const libDir = path.join(dir, "lib");
  const sourceModules = await getAllSourceModules(dir);
  const bundleMetrics: Record<string, unknown> = { modules: {} };

  for (const modulePath of sourceModules) {
    const relativePath = path.relative(libDir, modulePath);
    const moduleName = relativePath.replace(/\.ts$/, "").replace(/\\/g, "/");
    const moduleDir = path.dirname(relativePath);
    const baseName = path.basename(relativePath, ".ts");
    const outputDir =
      moduleDir === "." ? distDir : path.join(distDir, moduleDir);

    await ensureDir(outputDir);

    const moduleMetrics: Record<string, unknown> = {};

    for (const variant of VARIANTS) {
      const outputPath = path.join(
        outputDir,
        `${baseName}${variant.suffix}.js`,
      );
      const isMinified = variant.suffix === ".min";

      const buildArgs = [
        "esbuild",
        modulePath,
        `--outfile=${outputPath}`,
        "--format=esm",
        "--target=es2020",
        "--platform=browser",
      ];

      if (isMinified) {
        buildArgs.push("--minify", "--sourcemap");
      }

      await execCommand("bunx", buildArgs, { cwd });

      if (fsStat.existsSync(outputPath)) {
        let content = await fs.readFile(outputPath, "utf8");

        content = content.replace(
          /from\s+["'](\.\.?\/[^"']+)["']/g,
          (match, importPath: string) => {
            if (importPath.endsWith(".js") || importPath.endsWith(".json"))
              return match;

            const sourceDir = path.dirname(modulePath);
            const sourcePath = path.resolve(sourceDir, importPath);
            const sourceIndexPath = path.join(sourcePath, "index.ts");

            if (fsStat.existsSync(sourceIndexPath)) {
              return match.replace(importPath, `${importPath}/index.js`);
            }
            return match.replace(importPath, `${importPath}.js`);
          },
        );

        content = content.replace(
          /import\s*\(\s*["'](\.\.?\/[^"']+)["']\s*\)/g,
          (match, importPath: string) => {
            if (importPath.endsWith(".js") || importPath.endsWith(".json"))
              return match;

            const sourceDir = path.dirname(modulePath);
            const sourcePath = path.resolve(sourceDir, importPath);
            const sourceIndexPath = path.join(sourcePath, "index.ts");

            if (fsStat.existsSync(sourceIndexPath)) {
              return match.replace(importPath, `${importPath}/index.js`);
            }
            return match.replace(importPath, `${importPath}.js`);
          },
        );

        if (isMinified) {
          content = content.replace(
            /from\s+["']([^"']*\.js)["']/g,
            (match, importPath: string) => {
              if (importPath.endsWith(".min.js")) return match;
              return match.replace(
                importPath,
                importPath.replace(".js", ".min.js"),
              );
            },
          );
          content = content.replace(
            /import\s*\(\s*["']([^"']*\.js)["']\s*\)/g,
            (match, importPath: string) => {
              if (importPath.endsWith(".min.js")) return match;
              return match.replace(
                importPath,
                importPath.replace(".js", ".min.js"),
              );
            },
          );
        }

        await fs.writeFile(outputPath, content, "utf8");
      }

      if (variant.terser && fsStat.existsSync(outputPath)) {
        try {
          await applyTerser(outputPath, variant.terser.mangle);
          await fixMinifiedImports(outputPath);
        } catch (terserError) {
          logger.warn(
            `Warning: Terser optimization failed for ${moduleName}${variant.suffix}: ${(terserError as Error).message}`,
          );
        }
      }

      if (fsStat.existsSync(outputPath)) {
        moduleMetrics[variant.suffix || "regular"] =
          await calculateFileMetrics(outputPath);
      }
    }

    (bundleMetrics.modules as Record<string, unknown>)[moduleName] =
      moduleMetrics;
  }

  return bundleMetrics;
}
