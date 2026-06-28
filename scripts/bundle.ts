import fsStat from "node:fs";
import {
  logger,
  projectRoot,
  packagesDir,
} from "./utils/index.js";
import { derivePackageGraph } from "./bundle/config.js";
import {
  buildPackageEntry,
  buildAllPackagesFromOrder,
  reportSummary,
  reportSingleResult,
} from "./bundle/orchestrate.js";

const PACKAGE_GRAPH = derivePackageGraph();
const args = process.argv.slice(2);
const packageName = args.find((arg) => !arg.startsWith("--"));
const buildAll = !packageName;
const bundleMode = args.includes("--size-mode") ? "size" : "dev";
const shouldClean = args.includes("--clean");

async function main(): Promise<void> {
  try {
    if (buildAll) {
      if (!fsStat.existsSync(packagesDir)) {
        throw new Error("Packages directory not found");
      }
      const { results, summary } = await buildAllPackagesFromOrder(
        packagesDir,
        PACKAGE_GRAPH.buildOrder,
        bundleMode,
        shouldClean,
      );
      reportSummary(results, summary);
    } else if (packageName) {
      const result = await buildPackageEntry(
        packageName,
        projectRoot,
        bundleMode,
        shouldClean,
      );
      reportSingleResult(packageName, result);
    }
  } catch (error) {
    logger.error(`Build system failed: ${(error as Error).message}`);
    process.exit(1);
  }
}

if (import.meta.main) {
  main().catch((error: Error) => {
    logger.error("Fatal error:", error);
    process.exit(1);
  });
}
