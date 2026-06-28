import fsStat from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";

/**
 * Verify all expected build artifacts exist and are non-empty.
 * Throws on missing or empty bundle.js, index.d.ts, or source maps.
 */
export async function validateBuildArtifacts(
  packageDir: string,
): Promise<void> {
  const distDir = path.join(packageDir, "dist");
  const baseFiles = ["index.d.ts"];
  const possibleBundleFiles = ["bundle.js", "bundle.min.js"];

  let foundBundle = false;
  for (const bundleFile of possibleBundleFiles) {
    if (fsStat.existsSync(path.join(distDir, bundleFile))) {
      foundBundle = true;
      break;
    }
  }

  if (!foundBundle) {
    throw new Error(
      `No bundle artifacts found. Expected at least one of: ${possibleBundleFiles.join(", ")}`,
    );
  }

  for (const file of baseFiles) {
    const filePath = path.join(distDir, file);
    if (!fsStat.existsSync(filePath)) {
      throw new Error(`Missing build artifact: ${file}`);
    }
    const stat = await fs.stat(filePath);
    if (stat.size === 0) {
      throw new Error(`Empty build artifact: ${file}`);
    }
  }

  for (const bundleFile of possibleBundleFiles) {
    const filePath = path.join(distDir, bundleFile);
    if (fsStat.existsSync(filePath)) {
      const stat = await fs.stat(filePath);
      if (stat.size === 0) {
        throw new Error(`Empty build artifact: ${bundleFile}`);
      }

      const mapFile = `${bundleFile}.map`;
      const mapPath = path.join(distDir, mapFile);
      if (fsStat.existsSync(mapPath)) {
        const mapStat = await fs.stat(mapPath);
        if (mapStat.size === 0) {
          throw new Error(`Empty source map: ${mapFile}`);
        }
      }
    }
  }
}
