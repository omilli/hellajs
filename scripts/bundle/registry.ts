import fs from "node:fs/promises";
import path from "node:path";
import { transformSync } from "@babel/core";
import babelHellaJS from "babel-plugin-hellajs";
// @ts-expect-error @babel/preset-typescript ships no type declarations
import presetTypeScript from "@babel/preset-typescript";
import { applyStyleVariant } from "../../packages/ui/lib/internal/transform.js";
import {
  ensureDir,
  execCommand,
  projectRoot,
  readJson,
  scanDirRecursive,
} from "../utils/index.js";
import type { PackageInfo } from "../utils/index.js";

const UI_STYLES = ["css", "tailwind"] as const;

type UiStyle = (typeof UI_STYLES)[number];

interface RegistryStyleSlot {
  files?: string[];
  deps?: string[];
  registryDependencies?: string[];
}

interface RegistryEntry {
  files?: string[];
  styles?: Record<string, RegistryStyleSlot>;
}

interface RegistryManifest {
  entries: Record<string, RegistryEntry>;
}

/**
 * Transform registry source with the exact options `plugins/vite/index.mjs`
 * applies, so compiled registry variants match what a user's Vite build
 * produces from the same text.
 * @param code Flavor-resolved registry source text.
 * @param filename Source file name (drives babel's TS/JSX parsing).
 * @returns Compiled JavaScript.
 */
function transformRegistrySource(code: string, filename: string): string {
  const result = transformSync(code, {
    plugins: [babelHellaJS],
    presets: [presetTypeScript],
    filename,
    ast: false,
    sourceMaps: true,
    configFile: false,
    babelrc: false,
    parserOpts: { plugins: ["jsx"] },
  });
  if (typeof result?.code !== "string") {
    throw new Error(`[bundle] registry transform produced no code for ${filename}`);
  }
  return result.code;
}

/**
 * Compile one registry source file into its output directory and stage the
 * flavor-resolved source for declaration emission. Plain JS/CSS copies
 * verbatim; TS/TSX runs the babel mirror.
 * @param sourcePath Registry source file path.
 * @param outDir Output directory for the compiled artifact.
 * @param outRoot Registry output root (`dist/registry`).
 * @param stageDir Declaration staging root, or null to skip staging.
 * @param styleModuleText Style module text spliced into the canonical's marker
 * regions, or null to compile the file verbatim (no canonicals of its own).
 * @param style Target registry style.
 */
async function compileFile(
  sourcePath: string,
  outDir: string,
  outRoot: string,
  stageDir: string | null,
  styleModuleText: string | null,
  style: UiStyle,
): Promise<void> {
  const filename = path.basename(sourcePath);
  const ext = path.extname(filename);
  await ensureDir(outDir);

  if (ext !== ".ts" && ext !== ".tsx") {
    await fs.copyFile(sourcePath, path.join(outDir, filename));
    return;
  }

  const canonical = await fs.readFile(sourcePath, "utf8");
  const flavored = styleModuleText === null ? canonical : applyStyleVariant(canonical, styleModuleText, style);
  const compiled = transformRegistrySource(flavored, filename);
  await fs.writeFile(path.join(outDir, `${path.basename(filename, ext)}.js`), compiled);

  if (stageDir !== null) {
    const stageOut = path.join(stageDir, path.relative(outRoot, outDir));
    await ensureDir(stageOut);
    await fs.writeFile(path.join(stageOut, filename), flavored);
  }
}

/**
 * Compile a registry dependency's TS modules into the dependent's output
 * directory so relative imports in spliced tailwind variants (`./cn`)
 * resolve in dist. Dependencies (theme, cn) carry no canonicals, so their
 * files compile verbatim; non-TS dependency files (stylesheets) ride their
 * own entries and are skipped.
 *
 * @param depName Registry entry the dependency resolves to.
 * @param style Target registry style.
 * @param manifest Parsed registry manifest.
 * @param registryDir Source registry directory.
 * @param outDir Dependent's output directory.
 * @param outRoot Registry output root (`dist/registry`).
 * @param stageDir Declaration staging root.
 */
async function compileDependency(
  depName: string,
  style: UiStyle,
  manifest: RegistryManifest,
  registryDir: string,
  outDir: string,
  outRoot: string,
  stageDir: string,
): Promise<void> {
  const dep = manifest.entries[depName];
  if (dep === undefined) {
    throw new Error(`[bundle] registry dependency "${depName}" is not a declared entry`);
  }
  const slot = dep.styles?.[style];
  const files = [...(dep.files ?? []), ...(slot?.files ?? [])];
  for (const file of files) {
    const ext = path.extname(file);
    if (ext !== ".ts" && ext !== ".tsx") continue;
    await compileFile(
      path.join(registryDir, depName, file),
      outDir,
      outRoot,
      stageDir,
      null,
      style,
    );
  }
}

/**
 * Reads an entry's conventionally named style module (`<name>-<style>.ts`).
 * Component entries (those with shared canonical files) must carry one per
 * declared style; shared entries (theme, cn) have none.
 * @param registryDir Source registry directory.
 * @param name Entry name.
 * @param style Target registry style.
 * @param hasSharedFiles Whether the entry declares shared canonical files.
 * @returns The style module text, or null when the entry has no canonicals.
 */
async function readStyleModule(
  registryDir: string,
  name: string,
  style: UiStyle,
  hasSharedFiles: boolean,
): Promise<string | null> {
  if (!hasSharedFiles) return null;
  const styleFile = path.join(registryDir, name, `${name}-${style}.ts`);
  try {
    return await fs.readFile(styleFile, "utf8");
  } catch {
    throw new Error(`[bundle] registry entry "${name}" is missing its style module "${name}-${style}.ts"`);
  }
}
/**
 * Compile the ui registry into `dist/registry`: canonical component files
 * per format and style (babel mirror of the vite transform), each flavor
 * resolved by splicing the entry's style module through the same path, plus
 * verbatim theme/cn copies. Declaration files are emitted by tsc over the
 * staged generated sources, so a style module that produces non-compiling
 * output fails the build. ui-only — the orchestrator gates the call.
 * @param packageInfo Target package metadata (must be ui).
 */
export async function compileRegistry(packageInfo: PackageInfo): Promise<void> {
  const registryDir = path.join(packageInfo.dir, "registry");
  const manifest = await readJson<RegistryManifest>(path.join(registryDir, "registry.json"));
  const outDir = path.join(packageInfo.distDir, "registry");
  const stageDir = path.join(outDir, ".src");

  await fs.rm(outDir, { recursive: true, force: true });
  await ensureDir(outDir);

  try {
    const entryNames = Object.keys(manifest.entries).sort();
    for (const name of entryNames) {
      const entry = manifest.entries[name]!;
      const styles = Object.keys(entry.styles ?? {});
      for (const style of styles) {
        if (!UI_STYLES.includes(style as UiStyle)) {
          throw new Error(`[bundle] registry entry "${name}" declares unknown style "${style}"`);
        }
        const styleName = style as UiStyle;
        const slot = entry.styles![style]!;
        const shared = entry.files ?? [];
        const styleModuleText = await readStyleModule(registryDir, name, styleName, shared.length > 0);
        const outBase = shared.length > 0
          ? path.join(outDir, name, style)
          : path.join(outDir, name);

        for (const file of shared) {
          await compileFile(path.join(registryDir, name, file), outBase, outDir, stageDir, styleModuleText, styleName);
        }
        for (const file of slot.files ?? []) {
          await compileFile(path.join(registryDir, name, file), outBase, outDir, stageDir, null, styleName);
        }
        for (const dep of slot.registryDependencies ?? []) {
          await compileDependency(dep, styleName, manifest, registryDir, outBase, outDir, stageDir);
        }
      }
    }

    const staged = await scanDirRecursive(stageDir, /\.(ts|tsx)$/);
    if (staged.length > 0) {
      await execCommand("bunx", [
        "tsc",
        ...staged,
        "--ignoreConfig",
        "--emitDeclarationOnly",
        "--declaration",
        "--target",
        "esnext",
        "--module",
        "esnext",
        "--moduleResolution",
        "bundler",
        "--jsx",
        "preserve",
        "--strict",
        "--skipLibCheck",
        "--verbatimModuleSyntax",
        "--outDir",
        outDir,
      ], { cwd: projectRoot });
    }
  } finally {
    await fs.rm(stageDir, { recursive: true, force: true });
  }
}
