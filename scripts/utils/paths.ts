import path from "node:path";

export const projectRoot = path.resolve(process.cwd());
export const packagesDir = path.join(projectRoot, "packages");
export const pluginsDir = path.join(projectRoot, "plugins");
export const testsDir = path.join(projectRoot, "tests");
export const scriptsDir = path.join(projectRoot, "scripts");
export const changesetDir = path.join(projectRoot, ".changeset");

export function getPackagePath(packageName: string): string | null {
  if (packageName.startsWith("@hellajs/")) {
    return path.join(packagesDir, packageName.replace("@hellajs/", ""));
  }
  if (packageName.endsWith("-plugin-hellajs")) {
    return path.join(pluginsDir, packageName.replace("-plugin-hellajs", ""));
  }
  return null;
}

export function getPackagePaths(packageName: string): {
  packageDir: string;
  packageJsonPath: string;
  libDir: string;
  distDir: string;
  cacheDir: string;
  entryPoint: string;
  tsconfigPath: string;
  testDir: string;
  testFile: string;
} {
  const packageDir = path.join(packagesDir, packageName);

  return {
    packageDir,
    packageJsonPath: path.join(packageDir, "package.json"),
    libDir: path.join(packageDir, "lib"),
    distDir: path.join(packageDir, "dist"),
    cacheDir: path.join(packageDir, ".build-cache"),
    entryPoint: path.join(packageDir, "lib/index.ts"),
    tsconfigPath: path.join(packageDir, "tsconfig.json"),
    testDir: path.join(packageDir, "tests"),
    testFile: path.join(packageDir, "tests", `${packageName}.test.ts`),
  };
}
