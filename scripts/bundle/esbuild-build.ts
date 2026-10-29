import fsStat from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { ensureDir, scanDirRecursive, logger, execCommand, projectRoot } from "../utils/index.ts";
import { VARIANTS } from "./config.ts";
import { transformRegistrySource } from "./registry.ts";
import { buildSsrModules, fixRelativeImports } from "./ssr-build.ts";
import { applyTerser, fixMinifiedImports } from "./optimize.ts";
import { calculateFileMetrics } from "./metrics.ts";

/** The esbuild binary from the local npm tree (PM-agnostic spawn target). */
const esbuildBin = path.join(projectRoot, "node_modules/.bin/esbuild");

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
    inputPath,
    "--bundle",
    `--outfile=${outputPath}`,
    "--format=esm",
    "--target=es2020",
    "--platform=browser",
    "--external:node:*",
    "--out-extension:.js=.js",
    ...externals,
  ];

  if (isMinified) {
    buildArgs.push("--minify", "--sourcemap");
  }

  await execCommand(esbuildBin, buildArgs, { cwd });
}

async function getAllSourceModules(packageDir: string): Promise<string[]> {
  const libDir = path.join(packageDir, "lib");
  if (!fsStat.existsSync(libDir)) return [];

  const files = await scanDirRecursive(libDir, /\.tsx?$/);
  return files.filter((file) => !file.endsWith(".d.ts"));
}

/**
 * Compile every `.tsx` source under a directory root into a mirrored `.js`
 * tree through the vite-mirror babel pass — JSX must compile to imperative
 * `@hellajs/dom/runtime` construction before esbuild sees it (esbuild's own
 * JSX transform would emit React-semantics calls no HellaJS runtime serves).
 * Plain `.ts` modules copy verbatim so extensionless relative imports resolve
 * inside the mirror; `.d.ts` files are skipped (type-only, erased).
 * @param libDir Source lib directory.
 * @param mirrorDir Output mirror root.
 */
async function mirrorJsxSources(libDir: string, mirrorDir: string): Promise<void> {
  const sources = (await scanDirRecursive(libDir, /\.tsx?$/)).filter(
    (file) => !file.endsWith(".d.ts"),
  );
  for (const source of sources) {
    const relative = path.relative(libDir, source);
    const outPath = path.join(mirrorDir, relative.replace(/\.tsx$/, ".js"));
    await ensureDir(path.dirname(outPath));
    if (source.endsWith(".tsx")) {
      const text = await fs.readFile(source, "utf8");
      await fs.writeFile(outPath, transformRegistrySource(text, path.basename(source)));
    } else {
      await fs.copyFile(source, outPath);
    }
  }
}

/**
 * External flags for a package's peers plus its declared runtime dependencies:
 * peers are convention-declared, and a declared dependency (ui's esbuild JS
 * API) must never inline into dist. Only the bundle build consumes these —
 * the per-module build passes no `--bundle`, so esbuild rejects `--external`
 * there and a pure transpile preserves external imports verbatim.
 * @param packageInfo Package metadata carrying peerDependencies keys and the parsed package.json.
 * @returns esbuild `--external:` flags.
 */
function externalFlags(packageInfo: {
  peerDeps: string[];
  packageJson: Record<string, unknown>;
}): string[] {
  const dependencies = Object.keys(
    (packageInfo.packageJson.dependencies as Record<string, string>) || {},
  );
  return [...packageInfo.peerDeps, ...dependencies].map((dep) => `--external:${dep}`);
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
  const { dir, distDir } = packageInfo;
  const externals = externalFlags(packageInfo);
  const variants: (typeof VARIANTS)[number][] = bundleMode === "size" ? [VARIANTS[1]!] : VARIANTS;
  const bundleMetrics: Record<string, unknown> = {};

  // Packages with `.tsx` lib sources bundle from a mirror whose JSX is already
  // compiled (see mirrorJsxSources); the entry path swaps, everything else is
  // identical output.
  const libDir = path.join(dir, "lib");
  let bundleEntry = path.join(libDir, "index.ts");
  if (fsStat.existsSync(libDir)) {
    const jsxSources = (await scanDirRecursive(libDir, /\.tsx$/)).filter(
      (file) => !file.endsWith(".d.ts"),
    );
    if (jsxSources.length > 0) {
      const mirrorDir = path.join(packageInfo.cacheDir, "bundle-src");
      await fs.rm(mirrorDir, { recursive: true, force: true });
      await mirrorJsxSources(libDir, mirrorDir);
      bundleEntry = path.join(mirrorDir, "index.ts");
    }
  }

  for (const variant of variants) {
    const bundlePath = path.join(distDir, `bundle${variant.suffix}.js`);
    const isMinified = variant.suffix === ".min";

    await buildWithEsbuild(bundleEntry, bundlePath, externals, isMinified, cwd);

    if (fsStat.existsSync(bundlePath)) {
      let content = await fs.readFile(bundlePath, "utf8");

      if (isMinified) {
        content = content.replace(/from\s+["']([^"']*\.js)["']/g, (match, importPath: string) => {
          if (importPath.endsWith(".min.js")) return match;
          return match.replace(importPath, importPath.replace(".js", ".min.js"));
        });
        content = content.replace(
          /import\s*\(\s*["']([^"']*\.js)["']\s*\)/g,
          (match, importPath: string) => {
            if (importPath.endsWith(".min.js")) return match;
            return match.replace(importPath, importPath.replace(".js", ".min.js"));
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
 * Packages with `.tsx` lib sources additionally emit the ast-target `dist/ssr` variant.
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
  const { dir, distDir, cacheDir } = packageInfo;
  const libDir = path.join(dir, "lib");
  const sourceModules = await getAllSourceModules(dir);
  const bundleMetrics: Record<string, unknown> = { modules: {} };

  await buildSsrModules(packageInfo, sourceModules, cwd);

  for (const modulePath of sourceModules) {
    const relativePath = path.relative(libDir, modulePath);
    const extension = path.extname(modulePath);
    const isTsx = extension === ".tsx";
    const moduleName = relativePath.replace(/\.tsx?$/, "").replace(/\\/g, "/");
    const moduleDir = path.dirname(relativePath);
    const baseName = path.basename(relativePath, extension);
    const outputDir = moduleDir === "." ? distDir : path.join(distDir, moduleDir);

    await ensureDir(outputDir);

    // `.tsx` modules compile through the vite-mirror babel pass first (JSX →
    // imperative construction); esbuild transpiles the compiled JS. The import
    // fixups below still resolve against the original source directory.
    let esbuildInput = modulePath;
    if (isTsx) {
      const source = await fs.readFile(modulePath, "utf8");
      esbuildInput = path.join(cacheDir, "modules", `${moduleName}.js`);
      await ensureDir(path.dirname(esbuildInput));
      await fs.writeFile(esbuildInput, transformRegistrySource(source, path.basename(modulePath)));
    }

    const moduleMetrics: Record<string, unknown> = {};

    for (const variant of VARIANTS) {
      const outputPath = path.join(outputDir, `${baseName}${variant.suffix}.js`);
      const isMinified = variant.suffix === ".min";

      const buildArgs = [
        esbuildInput,
        `--outfile=${outputPath}`,
        "--format=esm",
        "--target=es2020",
        "--platform=browser",
      ];

      if (isMinified) {
        buildArgs.push("--minify", "--sourcemap");
      }

      await execCommand(esbuildBin, buildArgs, { cwd });

      if (fsStat.existsSync(outputPath)) {
        let content = await fs.readFile(outputPath, "utf8");

        content = fixRelativeImports(content, modulePath);

        if (isMinified) {
          content = content.replace(
            /(?:from|import)\s+["']([^"']*\.js)["']/g,
            (match, importPath: string) => {
              if (importPath.endsWith(".min.js")) return match;
              return match.replace(importPath, importPath.replace(".js", ".min.js"));
            },
          );
          content = content.replace(
            /import\s*\(\s*["']([^"']*\.js)["']\s*\)/g,
            (match, importPath: string) => {
              if (importPath.endsWith(".min.js")) return match;
              return match.replace(importPath, importPath.replace(".js", ".min.js"));
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
        moduleMetrics[variant.suffix || "regular"] = await calculateFileMetrics(outputPath);
      }
    }

    (bundleMetrics.modules as Record<string, unknown>)[moduleName] = moduleMetrics;
  }

  return bundleMetrics;
}
