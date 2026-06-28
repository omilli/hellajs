import fs from "node:fs/promises";
import { gzipSync } from "node:zlib";
import path from "node:path";
import { logger } from "../utils/index.js";
import type { BuildMetrics } from "./config.js";

/**
 * Calculate raw and gzipped size for a single file.
 * @returns Size object with bundleSize and gzipSize in KB
 */
export async function calculateFileMetrics(
  filePath: string,
): Promise<BuildMetrics> {
  const fileContents = await fs.readFile(filePath);
  const stats = await fs.stat(filePath);
  const gzipSize = gzipSync(fileContents).length;
  return {
    bundleSize: Math.round((stats.size / 1024) * 100) / 100,
    gzipSize: Math.round((gzipSize / 1024) * 100) / 100,
  };
}

/**
 * Calculate and persist size metrics to dist/sizes.json.
 * @returns The bundleMetrics passed in (passthrough for chaining)
 */
export async function calculateMetrics(
  packageInfo: { name: string; distDir: string },
  bundleMetrics: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const { name, distDir } = packageInfo;

  if (Object.keys(bundleMetrics).length === 0) return {};

  const sizesPath = path.join(distDir, "sizes.json");
  const sizeData = {
    packageName: name,
    variants: bundleMetrics,
    timestamp: new Date().toISOString(),
  };

  try {
    await fs.writeFile(sizesPath, JSON.stringify(sizeData, null, 2));
  } catch (error) {
    logger.warn(
      `Warning: Failed to write size data for ${name}: ${(error as Error).message}`,
    );
  }

  return bundleMetrics;
}
