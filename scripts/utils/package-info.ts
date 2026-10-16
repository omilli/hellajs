import fs from "node:fs";
import path from "node:path";
import { getPackagePaths, pluginsDir } from "./paths.ts";
import { readJson } from "./fs.ts";

export interface PackageInfo {
  name: string;
  fullName: string;
  version: string;
  dir: string;
  entryPoint: string;
  tsconfigPath: string;
  distDir: string;
  cacheDir: string;
  peerDeps: string[];
  packageJson: Record<string, unknown>;
}

export async function getPackageInfo(packageName: string, validate = true): Promise<PackageInfo> {
  const paths = getPackagePaths(packageName);

  if (validate) {
    const validations: { path: string; name: string }[] = [
      { path: paths.packageDir, name: "package directory" },
      { path: paths.packageJsonPath, name: "package.json" },
      { path: paths.entryPoint, name: "entry point" },
      { path: paths.tsconfigPath, name: "tsconfig.json" },
    ];

    for (const { path: filePath, name } of validations) {
      if (!fs.existsSync(filePath)) {
        throw new Error(`${name} not found: ${filePath}`);
      }
    }
  }

  const packageJson = await readJson<Record<string, unknown>>(paths.packageJsonPath);
  const peerDeps = Object.keys((packageJson.peerDependencies as Record<string, string>) || {});

  return {
    name: packageName,
    fullName: packageJson.name as string,
    version: packageJson.version as string,
    dir: paths.packageDir,
    entryPoint: paths.entryPoint,
    tsconfigPath: paths.tsconfigPath,
    distDir: paths.distDir,
    cacheDir: paths.cacheDir,
    peerDeps,
    packageJson,
  };
}

export function isValidPackage(packageName: string): boolean {
  const { packageDir, packageJsonPath } = getPackagePaths(packageName);
  return fs.existsSync(packageDir) && fs.existsSync(packageJsonPath);
}

/**
 * Whether `plugins/<pluginName>/` is a workspace (directory + package.json).
 * The plugin-scope counterpart of `isValidPackage`.
 *
 * @param pluginName Bare plugin directory name (e.g. `babel`).
 * @returns True when the plugin workspace exists.
 */
export function isValidPlugin(pluginName: string): boolean {
  const pluginDir = path.join(pluginsDir, pluginName);
  return fs.existsSync(pluginDir) && fs.existsSync(path.join(pluginDir, "package.json"));
}
