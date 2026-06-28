import fsStat from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import {
  ensureDir,
  scanDirRecursive,
  execCommand,
} from "../utils/index.js";

/**
 * Generate TypeScript declaration files via tsc --emitDeclarationOnly.
 * @param packageInfo Target package metadata
 * @param cwd Working directory for the tsc process
 */
export async function buildDeclarations(
  packageInfo: {
    distDir: string;
    tsconfigPath: string;
    name: string;
    fullName: string;
    version: string;
    dir: string;
    entryPoint: string;
    cacheDir: string;
    peerDeps: string[];
    packageJson: Record<string, unknown>;
  },
  cwd: string,
): Promise<void> {
  const { distDir, tsconfigPath } = packageInfo;
  const tscArgs = [
    "tsc",
    "--project",
    tsconfigPath,
    "--emitDeclarationOnly",
    "--outDir",
    distDir,
  ];
  await execCommand("bunx", tscArgs, { cwd });
}

/**
 * Copy hand-written .d.ts files from lib/ to dist/, preserving directory structure.
 */
export async function copyDeclarationFiles(
  packageInfo: {
    dir: string;
    distDir: string;
    name: string;
    fullName: string;
    version: string;
    entryPoint: string;
    tsconfigPath: string;
    cacheDir: string;
    peerDeps: string[];
    packageJson: Record<string, unknown>;
  },
): Promise<void> {
  const { dir, distDir } = packageInfo;
  const libDir = path.join(dir, "lib");

  if (!fsStat.existsSync(libDir)) return;

  const dtsFiles = await scanDirRecursive(libDir, /\.d\.ts$/);

  for (const dtsFile of dtsFiles) {
    const relativePath = path.relative(libDir, dtsFile);
    const destPath = path.join(distDir, relativePath);
    const destDir = path.dirname(destPath);

    await ensureDir(destDir);
    await fs.copyFile(dtsFile, destPath);
  }
}
