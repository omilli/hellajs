import fs from "node:fs";
import { getPackagePaths } from "./paths.js";
import { readJson } from "./fs.js";

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

export async function getPackageInfo(
  packageName: string,
  validate = true,
): Promise<PackageInfo> {
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

  const packageJson = await readJson<Record<string, unknown>>(
    paths.packageJsonPath,
  );
  const peerDeps = Object.keys(
    (packageJson.peerDependencies as Record<string, string>) || {},
  );

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
