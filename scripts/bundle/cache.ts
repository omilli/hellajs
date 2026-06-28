import { createHash } from "node:crypto";
import fsStat from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { ensureDir, scanDirRecursive, logger, execCommand, projectRoot } from "../utils/index.js";
import { BUILD_CONFIG } from "./config.js";

/**
 * Calculate SHA256 hash of file contents for cache invalidation.
 * @param filePath Absolute path to the file
 * @returns Hex digest string, or null if the file cannot be read
 */
export async function calculateFileHash(
  filePath: string,
): Promise<string | null> {
  try {
    const content = await fs.readFile(filePath);
    return createHash("sha256").update(content).digest("hex");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      logger.warn(
        `Warning: Failed to hash ${filePath}: ${(error as Error).message}`,
      );
    }
    return null;
  }
}

async function getAllSourceFiles(packageDir: string): Promise<string[]> {
  const coreFiles = [
    path.join(packageDir, "package.json"),
    path.join(packageDir, "tsconfig.json"),
  ];
  const sourceFiles = coreFiles.filter(fsStat.existsSync);
  const libDir = path.join(packageDir, "lib");
  if (fsStat.existsSync(libDir)) {
    sourceFiles.push(
      ...(await scanDirRecursive(libDir, /\.(ts|tsx|js|jsx)$/)),
    );
  }
  return sourceFiles;
}

async function getGitStatus(packageDir: string): Promise<string | null> {
  try {
    const result = await execCommand("git", [
      "status",
      "--porcelain",
      packageDir,
    ], { cwd: projectRoot });
    return result.stdout.trim();
  } catch {
    return null;
  }
}

/**
 * Check whether a cached build is still valid by comparing file hashes
 * and git status against the cached snapshot.
 * @returns False when invalid, truthy (cached data) when valid
 */
export async function isCacheValid(
  packageDir: string,
  cacheDir: string,
): Promise<boolean | Record<string, unknown>> {
  if (!BUILD_CONFIG.enableCache) return false;
  try {
    const cacheFile = path.join(cacheDir, "build-cache.json");
    if (!fsStat.existsSync(cacheFile)) return false;

    const cacheData = JSON.parse(await fs.readFile(cacheFile, "utf8"));
    if (!cacheData?.hashes || typeof cacheData.hashes !== "object")
      return false;

    const currentGitStatus = await getGitStatus(packageDir);
    if (currentGitStatus !== cacheData.gitStatus) return false;

    const currentFiles = (await getAllSourceFiles(packageDir)).filter(
      fsStat.existsSync,
    );
    const cachedFiles = Object.keys(cacheData.hashes);

    if (cachedFiles.length !== currentFiles.length) return false;
    if (currentFiles.some((f) => !(f in cacheData.hashes))) return false;
    if (cachedFiles.some((f) => !fsStat.existsSync(f))) return false;

    const hashResults = await Promise.all(
      currentFiles.map(
        async (file) =>
          (await calculateFileHash(file)) === cacheData.hashes[file],
      ),
    );

    return hashResults.every(Boolean);
  } catch {
    return false;
  }
}

/** Remove and recreate the cache directory. */
export async function cleanCache(cacheDir: string): Promise<void> {
  if (!BUILD_CONFIG.enableCache) return;
  try {
    if (fsStat.existsSync(cacheDir)) {
      await fs.rm(cacheDir, { recursive: true, force: true });
    }
    await ensureDir(cacheDir);
  } catch (error) {
    logger.warn(
      `Failed to clean cache directory: ${cacheDir} - ${(error as Error).message}`,
    );
  }
}

/**
 * Save build cache with file hashes, git status, and metrics.
 * @param packageDir Package root directory
 * @param cacheDir Cache directory to write into
 * @param metrics Build metrics to persist alongside the hash snapshot
 */
export async function updateCache(
  packageDir: string,
  cacheDir: string,
  metrics: Record<string, unknown>,
): Promise<void> {
  if (!BUILD_CONFIG.enableCache) return;
  try {
    await fs.mkdir(cacheDir, { recursive: true });
    const sourceFiles = await getAllSourceFiles(packageDir);
    const hashes: Record<string, string> = {};

    for (const file of sourceFiles) {
      if (fsStat.existsSync(file)) {
        const hash = await calculateFileHash(file);
        if (hash) hashes[file] = hash;
      }
    }

    const gitStatus = await getGitStatus(packageDir);
    const cacheData = {
      timestamp: Date.now(),
      version: "2.1",
      gitStatus,
      hashes,
      metrics,
    };

    const cacheFile = path.join(cacheDir, "build-cache.json");
    await fs.writeFile(cacheFile, JSON.stringify(cacheData, null, 2));
  } catch (error) {
    logger.warn(`Failed to update cache: ${(error as Error).message}`);
    cleanCache(cacheDir).catch((cleanError) =>
      logger.warn(
        `Failed to clean cache: ${(cleanError as Error).message}`,
      ),
    );
  }
}
